/*
 * Copyright 2019 Tomas Machalek <tomas.machalek@gmail.com>
 * Copyright 2019 Institute of the Czech National Corpus,
 *                Faculty of Arts, Charles University
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import * as Immutable from 'immutable';
import { Action, SEDispatcher, StatelessModel, IActionQueue } from 'kombo';
import { Observable, Observer, of as rxOf } from 'rxjs';
import { concatMap, map } from 'rxjs/operators';

import { AppServices } from '../../../appServices';
import { ConcApi, QuerySelector, mkLemmaMatchQuery } from '../../../common/api/kontext/concordance';
import { ConcResponse, ViewMode } from '../../../common/api/abstract/concordance';
import { TimeDistribResponse } from '../../../common/api/abstract/timeDistrib';
import { DataRow } from '../../../common/api/kontext/freqs';
import { KontextTimeDistribApi } from '../../../common/api/kontext/timeDistrib';
import { GeneralSingleCritFreqBarModelState } from '../../../common/models/freq';
import { ActionName as GlobalActionName, Actions as GlobalActions } from '../../../models/actions';
import { QueryFormModel, findCurrLemmaVariant } from '../../../models/query';
import { ConcLoadedPayload } from '../concordance/actions';
import { DataItemWithWCI, DataLoadedPayload, SubchartID } from './common';
import { AlphaLevel, wilsonConfInterval } from './stat';
import { Actions, ActionName } from './common';
import { callWithExtraVal } from '../../../common/api/util';
import { LemmaVariant } from '../../../common/query';
import { Backlink, BacklinkWithArgs } from '../../../common/tile';
import { HTTPMethod } from '../../../common/types';


export const enum FreqFilterQuantity {
    ABS = 'abs',
    ABS_PERCENTILE = 'pabs',
    IPM = 'ipm',
    IPM_PERCENTILE = 'pipm'
}

export const enum AlignType {
    RIGHT = 'right',
    LEFT = 'left'
}

export const enum Dimension {
    FIRST = 1,
    SECOND = 2
}


export interface BacklinkArgs {
    corpname:string;
    usesubcorp:string;
    q?:string;
    cql?:string;
    queryselector?:'cqlrow';
}

export interface TimeDistribModelState extends GeneralSingleCritFreqBarModelState<DataItemWithWCI> {
    subcnames:Immutable.List<string>;
    subcDesc:string;
    alphaLevel:AlphaLevel;
    posQueryGenerator:[string, string];
    isTweakMode:boolean;
    dataCmp:Immutable.List<DataItemWithWCI>;
    wordCmp:string;
    wordCmpInput:string;
    wordMainLabel:string; // a copy from mainform state used to attach a legend
    backlink:BacklinkWithArgs<BacklinkArgs>;
}


const roundFloat = (v:number):number => Math.round(v * 100) / 100;

const calcIPM = (v:DataRow|DataItemWithWCI, domainSize:number) => Math.round(v.freq / domainSize * 1e6 * 100) / 100;


interface DataFetchArgsOwn {
    subcName:string;
    wordMainLabel:string;
    targetId:SubchartID;
    concId:string;
    origQuery:string;
}

function isDataFetchArgsOwn(v:DataFetchArgsOwn|DataFetchArgsForeignConc): v is DataFetchArgsOwn {
    return v['origQuery'] !== undefined;
}

interface DataFetchArgsForeignConc {
    subcName:string;
    wordMainLabel:string;
    targetId:SubchartID;
    concId:string;
}

export interface TimeDistribModelArgs {
    dispatcher:IActionQueue;
    initState:TimeDistribModelState;
    tileId:number;
    waitForTile:number;
    api:KontextTimeDistribApi;
    concApi:ConcApi;
    appServices:AppServices;
    mainForm:QueryFormModel;
    backlink:Backlink;
}

/**
 *
 */
export class TimeDistribModel extends StatelessModel<TimeDistribModelState> {

    private readonly api:KontextTimeDistribApi;

    private readonly concApi:ConcApi|null;

    private readonly appServices:AppServices;

    private readonly tileId:number;

    private readonly waitForTile:number;

    private readonly mainForm:QueryFormModel;

    private readonly backlink:Backlink;

    private unfinishedChunks:Immutable.Map<string, boolean>; // subcname => done

    constructor({dispatcher, initState, tileId, waitForTile, api,
                concApi, appServices, mainForm, backlink}) {
        super(dispatcher, initState);
        this.tileId = tileId;
        this.api = api;
        this.concApi = concApi;
        this.waitForTile = waitForTile;
        this.appServices = appServices;
        this.mainForm = mainForm;
        this.backlink = backlink;
        this.unfinishedChunks = Immutable.Map<string, boolean>(initState.subcnames.flatMap(
                v => Immutable.List([[this.mkChunkId(v, SubchartID.MAIN), false], [this.mkChunkId(v, SubchartID.SECONDARY), false]])));

        this.actionMatch = {
            [GlobalActionName.RequestQueryResponse]: (state, action:GlobalActions.RequestQueryResponse) => {
                this.unfinishedChunks = this.mapChunkStatusOf(v => true).toMap();
                const newState = this.copyState(state);
                newState.data = Immutable.List<DataItemWithWCI>();
                newState.isBusy = true;
                newState.error = null;
                return newState;
            },
            [GlobalActionName.TileDataLoaded]: (state, action:GlobalActions.TileDataLoaded<DataLoadedPayload>) => {
                if (action.payload.tileId === this.tileId) {
                    const newState = this.copyState(state);
                    const prevData = this.getDataOf(newState, action.payload.subchartId);
                    let newData:Immutable.List<DataItemWithWCI>;
                    if (action.error) {
                        this.unfinishedChunks = this.mapChunkStatusOf((v, k) => false, action.payload.subchartId).toMap();
                        newData = Immutable.List<DataItemWithWCI>();
                        newState.error = action.error.message;
                        newState.isBusy = false;

                    } else {
                        if (action.payload.subchartId === SubchartID.MAIN) {
                            newState.wordMainLabel = action.payload.wordMainLabel;
                        }
                        newData = this.mergeChunks(
                            prevData,
                            Immutable.List<DataItemWithWCI>(action.payload.data),
                            state.alphaLevel
                        );
                        this.unfinishedChunks = this.unfinishedChunks.set(this.mkChunkId(action.payload.subcname, action.payload.subchartId), false);
                        if (!this.hasUnfinishedChunks(action.payload.subchartId)) {
                            newState.isBusy = false;
                        }
                    }
                    this.setDataOf(newState, action.payload.subchartId, newData);
                    newState.backlink = this.createBackLink(newState, action.payload.concId, action.payload.origQuery);
                    return newState;
                }
                return state;
            },
            [GlobalActionName.EnableTileTweakMode]: (state, action:GlobalActions.EnableTileTweakMode) => {
                if (action.payload.ident === this.tileId) {
                    const newState = this.copyState(state);
                    newState.isTweakMode = true;
                    return newState;
                }
                return state;
            },
            [GlobalActionName.DisableTileTweakMode]: (state, action:GlobalActions.DisableTileTweakMode) => {
                if (action.payload.ident === this.tileId) {
                    const newState = this.copyState(state);
                    newState.isTweakMode = false;
                    return newState;
                }
                return state;
            },
            [ActionName.ChangeCmpWord]: (state, action:Actions.ChangeCmpWord) => {
                if (action.payload.tileId === this.tileId) {
                    const newState = this.copyState(state);
                    newState.wordCmpInput = action.payload.value;
                    return newState;
                }
                return state;

            },
            [ActionName.SubmitCmpWord]: (state, action:Actions.SubmitCmpWord) => {
                if (action.payload.tileId === this.tileId) {
                    this.unfinishedChunks = this.mapChunkStatusOf(v => true).toMap();
                    const newState = this.copyState(state);
                    newState.isBusy = true;
                    newState.wordCmp = newState.wordCmpInput.trim();
                    newState.dataCmp = newState.dataCmp.clear();
                    return newState;
                }
                return state;
            }
        };
    }

    private createBackLink(state:TimeDistribModelState, concId:string, origQuery:string):BacklinkWithArgs<BacklinkArgs> {
        return this.backlink ?
            {
                url: this.backlink.url,
                method: this.backlink.method || HTTPMethod.GET,
                label: this.backlink.label,
                args: origQuery ?
                    {
                        corpname: state.corpname,
                        usesubcorp: this.backlink.subcname,
                        cql: origQuery,
                        queryselector: 'cqlrow'
                    } :
                    {
                        corpname: state.corpname,
                        usesubcorp: this.backlink.subcname,
                        q: `~${concId}`
                    }
            } :
            null;
    }

    private mkChunkId(subcname:string, subchartId:SubchartID):string {
        return `${subchartId}:${subcname}`;
    }

    private getDataOf(state:TimeDistribModelState, subchartId:SubchartID):Immutable.List<DataItemWithWCI> {
        return subchartId === SubchartID.MAIN ? state.data : state.dataCmp;
    }

    private setDataOf(state:TimeDistribModelState, subchartId:SubchartID, data:Immutable.List<DataItemWithWCI>):void {
        if (subchartId === SubchartID.MAIN) {
            state.data = data;

        } else {
            state.dataCmp = data;
        }
    }

    private mapChunkStatusOf(mapFn:((v:boolean, k:string) => boolean), subchartId?:SubchartID):Immutable.Map<string, boolean> {
        return this.unfinishedChunks.map((v, k) => (subchartId && k.startsWith(subchartId) || !subchartId) ? mapFn(v, k) : v).toMap();
    }

    private hasUnfinishedChunks(subchartId:SubchartID):boolean {
        return this.unfinishedChunks.filter((v, k) => k.startsWith(subchartId)).includes(true);
    }

    private mergeChunks(currData:Immutable.List<DataItemWithWCI>, newChunk:Immutable.List<DataItemWithWCI>, alphaLevel:AlphaLevel):Immutable.List<DataItemWithWCI> {
        return newChunk.reduce(
            (acc, curr) => {
                if (acc.has(curr.datetime)) {
                    const tmp = acc.get(curr.datetime);
                    tmp.freq += curr.freq;
                    tmp.datetime = curr.datetime;
                    tmp.norm += curr.norm;
                    tmp.ipm = calcIPM(tmp, tmp.norm);
                    const confInt = wilsonConfInterval(tmp.freq, tmp.norm, alphaLevel);
                    tmp.ipmInterval = [roundFloat(confInt[0] * 1e6), roundFloat(confInt[1] * 1e6)];
                    return acc.set(tmp.datetime, tmp);

                } else {
                    const confInt = wilsonConfInterval(curr.freq, curr.norm, alphaLevel);
                    return acc.set(curr.datetime, {
                        datetime: curr.datetime,
                        freq: curr.freq,
                        norm: curr.norm,
                        ipm: calcIPM(curr, curr.norm),
                        ipmInterval: [roundFloat(confInt[0] * 1e6), roundFloat(confInt[1] * 1e6)]
                    });
                }
            },
            Immutable.Map<string, DataItemWithWCI>(currData.map(v => [v.datetime, v]))

        ).sort((x1, x2) => parseInt(x1.datetime) - parseInt(x2.datetime)).toList();
    }


    private getFreqs(response:Observable<[TimeDistribResponse, DataFetchArgsOwn|DataFetchArgsForeignConc]>, seDispatch:SEDispatcher) {
        response.subscribe(
            data => {
                const [resp, args] = data;

                const dataFull = resp.data.map<DataItemWithWCI>(v => {
                    return {
                        datetime: v.datetime,
                        freq: v.freq,
                        norm: v.norm,
                        ipm: -1,
                        ipmInterval: [-1, -1]
                    };
                });

                seDispatch<GlobalActions.TileDataLoaded<DataLoadedPayload>>({
                    name: GlobalActionName.TileDataLoaded,
                    payload: {
                        tileId: this.tileId,
                        subchartId: args.targetId,
                        isEmpty: dataFull.length === 0,
                        data: dataFull,
                        subcname: resp.subcorpName,
                        concId: resp.concPersistenceID,
                        origQuery: isDataFetchArgsOwn(args) ? args.origQuery : '',
                        wordMainLabel: args.wordMainLabel
                    }
                });
            },
            error => {
                console.error(error);
                seDispatch<GlobalActions.TileDataLoaded<DataLoadedPayload>>({
                    name: GlobalActionName.TileDataLoaded,
                    payload: {
                        tileId: this.tileId,
                        subchartId: null,
                        isEmpty: true,
                        data: null,
                        subcname: null,
                        concId: null,
                        origQuery: null,
                        wordMainLabel: null
                    },
                    error: error
                });
            }
        );
    }

    private loadConcordance(state:TimeDistribModelState, lemmaVariant:LemmaVariant, subcname:string,
            target:SubchartID):Observable<[ConcResponse, DataFetchArgsOwn]> {
        return callWithExtraVal(
            this.concApi,
            this.concApi.stateToArgs(
                {
                    querySelector: QuerySelector.CQL,
                    corpname: state.corpname,
                    otherCorpname: undefined,
                    subcname: subcname,
                    subcDesc: null,
                    kwicLeftCtx: -1,
                    kwicRightCtx: 1,
                    pageSize: 10,
                    loadPage: 1,
                    currPage: 1,
                    shuffle: false,
                    attr_vmode: 'mouseover',
                    viewMode: ViewMode.KWIC,
                    tileId: this.tileId,
                    attrs: Immutable.List<string>(['word']),
                    metadataAttrs: Immutable.List<{value:string; label:string}>(),
                    concId: null,
                    posQueryGenerator: state.posQueryGenerator
                },
                lemmaVariant,
                null
            ),
            {
                concId: null,
                subcName: subcname,
                wordMainLabel: lemmaVariant.lemma,
                targetId: target,
                origQuery: mkLemmaMatchQuery(lemmaVariant, state.posQueryGenerator)
            }
        );
    }

    private loadData(state:TimeDistribModelState, dispatch:SEDispatcher, target:SubchartID, lemmaVariant:Observable<LemmaVariant>):void {
        if (this.waitForTile > -1) { // in this case we rely on a concordance provided by other tile
            this.suspend((action:Action) => {
                if (action.name === GlobalActionName.TileDataLoaded && action.payload['tileId'] === this.waitForTile) {
                    const payload = (action as GlobalActions.TileDataLoaded<ConcLoadedPayload>).payload;
                    const ans = lemmaVariant.pipe(
                        concatMap(
                            (lv) => {
                                return new Observable((observer:Observer<DataFetchArgsForeignConc>) => {
                                    if (action.error) {
                                        observer.error(new Error(this.appServices.translate('global__failed_to_obtain_required_data')));

                                    } else {
                                        observer.next({
                                            concId: payload.data.concPersistenceID,
                                            subcName: payload.data.subcorpName,
                                            wordMainLabel: lv.lemma,
                                            targetId: target
                                        });
                                        observer.complete();
                                    }
                                });
                            }
                        ),
                        concatMap(args => callWithExtraVal(
                            this.api,
                            {
                                corpName: state.corpname,
                                subcorpName: state.subcnames.get(0),
                                concIdent: `~${args.concId}`
                            },
                            args
                        ))
                    )
                    this.getFreqs(ans, dispatch);
                    return true;
                }
                return false;
            });

        } else { // here we must create our own concordance(s) if needed
            state.subcnames.toArray().map(subcname =>
                lemmaVariant.pipe(
                    concatMap((lv:LemmaVariant) => {
                        if (lv) {
                            return this.loadConcordance(state, lv, subcname, target);
                        }
                        return rxOf<[ConcResponse, DataFetchArgsOwn]>([
                            {
                                query: '',
                                corpName: state.corpname,
                                subcorpName: subcname,
                                lines: [],
                                concsize: 0,
                                arf: 0,
                                ipm: 0,
                                messages: [],
                                concPersistenceID: null
                            },
                            {
                                concId: null,
                                subcName: subcname,
                                wordMainLabel: '',
                                targetId: target,
                                origQuery: ''
                            }
                        ]);
                    }),
                    concatMap(
                        (data) => {
                            const [concResp, args] = data;
                            args.concId = concResp.concPersistenceID;
                            if (args.concId) {
                                return callWithExtraVal(
                                    this.api,
                                    {
                                        corpName: state.corpname,
                                        subcorpName: args.subcName,
                                        concIdent: `~${args.concId}`
                                    },
                                    args
                                );

                            } else {
                                return rxOf<[TimeDistribResponse, DataFetchArgsOwn]>([
                                    {
                                        corpName: state.corpname,
                                        subcorpName: args.subcName,
                                        concPersistenceID: null,
                                        data: []
                                    },
                                    args
                                ]);
                            }
                        }
                    )
                )

            ).forEach(resp => {
                this.getFreqs(resp, dispatch);
            });
        }
    }

    sideEffects(state:TimeDistribModelState, action:Action, dispatch:SEDispatcher):void {
        switch (action.name) {
            case GlobalActionName.RequestQueryResponse: {
                const formState = this.mainForm.getState();
                this.loadData(
                    state,
                    dispatch,
                    SubchartID.MAIN,
                    rxOf(findCurrLemmaVariant(formState.lemmas))
                );
            }
            break;
            case ActionName.SubmitCmpWord: {
                const formState = this.mainForm.getState();
                this.loadData(
                    state,
                    dispatch,
                    SubchartID.SECONDARY,
                    this.appServices.queryLemmaDbApi(formState.queryLanguage, state.wordCmp).pipe(
                        map(v => v.result[0])
                    )
                );
            }
            break;
            case GlobalActionName.GetSourceInfo:
                if (action.payload['tileId'] === this.tileId) {
                    this.api.getSourceDescription(this.tileId, this.appServices.getISO639UILang(), action.payload['corpusId'])
                    .subscribe(
                        (data) => {
                            dispatch({
                                name: GlobalActionName.GetSourceInfoDone,
                                payload: {
                                    data: data
                                }
                            });
                        },
                        (err) => {
                            console.error(err);
                            dispatch({
                                name: GlobalActionName.GetSourceInfoDone,
                                error: err

                            });
                        }
                    );
                }
            break;
        }
    }

}