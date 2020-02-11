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
import { SEDispatcher, StatelessModel, IActionQueue, Action } from 'kombo';
import { Observable, Observer, of as rxOf } from 'rxjs';
import { concatMap, map, mergeMap, reduce, tap, mapTo } from 'rxjs/operators';

import { AppServices } from '../../../appServices';
import { ConcApi, QuerySelector, mkMatchQuery } from '../../../common/api/kontext/concordance';
import { ConcResponse, ViewMode } from '../../../common/api/abstract/concordance';
import { TimeDistribResponse } from '../../../common/api/abstract/timeDistrib';
import { DataRow } from '../../../common/api/kontext/freqs';
import { KontextTimeDistribApi } from '../../../common/api/kontext/timeDistrib';
import { GeneralSingleCritFreqBarModelState } from '../../../common/models/freq';
import { ActionName as GlobalActionName, Actions as GlobalActions } from '../../../models/actions';
import { findCurrLemmaVariant } from '../../../models/query';
import { ConcLoadedPayload } from '../concordance/actions';
import { DataItemWithWCI, SubchartID, DataLoadedPayload } from './common';
import { AlphaLevel, wilsonConfInterval } from '../../../common/statistics';
import { Actions, ActionName } from './common';
import { callWithExtraVal } from '../../../common/api/util';
import { LemmaVariant, RecognizedQueries } from '../../../common/query';
import { Backlink, BacklinkWithArgs } from '../../../common/tile';
import { HTTPMethod } from '../../../common/types';
import { Dict } from '../../../common/collections';
import { TileWait } from '../../../models/tileSync';


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
    subcnames:Array<string>;
    subcDesc:string;
    alphaLevel:AlphaLevel;
    posQueryGenerator:[string, string];
    isTweakMode:boolean;
    dataCmp:Array<DataItemWithWCI>;
    wordCmp:string;
    wordCmpInput:string;
    wordMainLabel:string; // a copy from mainform state used to attach a legend
    backlink:BacklinkWithArgs<BacklinkArgs>;
    refArea:[number,number];
    zoom:[number, number];
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
    lemmas:RecognizedQueries;
    backlink:Backlink;
    queryLang:string;
}

/**
 *
 */
export class TimeDistribModel extends StatelessModel<TimeDistribModelState, TileWait<boolean>> {

    private readonly api:KontextTimeDistribApi;

    private readonly concApi:ConcApi|null;

    private readonly appServices:AppServices;

    private readonly tileId:number;

    private readonly waitForTile:number;

    private readonly lemmas:RecognizedQueries;

    private readonly queryLang:string;

    private readonly backlink:Backlink;


    constructor({dispatcher, initState, tileId, waitForTile, api,
                concApi, appServices, lemmas, queryLang, backlink}) {
        super(dispatcher, initState);
        this.tileId = tileId;
        this.api = api;
        this.concApi = concApi;
        this.waitForTile = waitForTile;
        this.appServices = appServices;
        this.lemmas = lemmas;
        this.queryLang = queryLang;
        this.backlink = backlink;

        this.addActionHandler<GlobalActions.RequestQueryResponse>(
            GlobalActionName.RequestQueryResponse,
            (state, action) => {
                state.data = [];
                state.isBusy = true;
                state.error = null;
            },
            (state, action, dispatch) => {
                this.loadData(
                    state,
                    dispatch,
                    SubchartID.MAIN,
                    rxOf(findCurrLemmaVariant(this.lemmas[0]))
                );
            }
        );

        this.addActionHandler<GlobalActions.TileDataLoaded<DataLoadedPayload>>(
            GlobalActionName.TileDataLoaded,
            (state, action) => {
                if (action.payload.tileId === this.tileId) {
                    state.isBusy = false;
                    if (action.error) {
                        state.data = [];
                        state.dataCmp = [];
                        state.error = action.error.message;
                    }
                }
            }
        );

        this.addActionHandler<GlobalActions.TilePartialDataLoaded<DataLoadedPayload>>(
            GlobalActionName.TilePartialDataLoaded,
            (state, action) => {
                if (action.payload.tileId === this.tileId) {
                    if (action.payload.data) {
                        state.data = this.mergeChunks(state.data, action.payload.data, state.alphaLevel);

                    } else if (action.payload.dataCmp) {
                        state.dataCmp = this.mergeChunks(state.dataCmp, action.payload.dataCmp, state.alphaLevel);
                    }
                    if (action.payload.wordMainLabel) {
                        state.wordMainLabel = action.payload.wordMainLabel;
                    }
                    state.backlink = this.createBackLink(state, action.payload.concId, action.payload.origQuery);
                }
                return state;
            }
        );

        this.addActionHandler<GlobalActions.EnableTileTweakMode>(
            GlobalActionName.EnableTileTweakMode,
            (state, action) => {
                if (action.payload.ident === this.tileId) {
                    state.isTweakMode = true;
                }
            }
        );

        this.addActionHandler<GlobalActions.DisableTileTweakMode>(
            GlobalActionName.DisableTileTweakMode,
            (state, action) => {
                if (action.payload.ident === this.tileId) {
                    state.isTweakMode = false;
                }
            }
        );

        this.addActionHandler<Actions.ChangeCmpWord>(
            ActionName.ChangeCmpWord,
            (state, action) => {
                if (action.payload.tileId === this.tileId) {
                    state.wordCmpInput = action.payload.value;
                }
            }
        );

        this.addActionHandler<Actions.SubmitCmpWord>(
            ActionName.SubmitCmpWord,
            (state, action) => {
                if (action.payload.tileId === this.tileId) {
                    state.isBusy = true;
                    state.wordCmp = state.wordCmpInput.trim();
                    state.dataCmp = []
                }
            },
            (state, action, dispatch) => {
                this.loadData(
                    state,
                    dispatch,
                    SubchartID.SECONDARY,
                    this.appServices.queryLemmaDbApi(this.queryLang, state.wordCmp).pipe(
                        map(v => v.result[0])
                    )
                );
            }
        );

        this.addActionHandler(
            GlobalActionName.GetSourceInfo,
            (state, action) => state,
            (state, action, dispatch) => {
                if (action.payload['tileId'] === this.tileId) {
                    this.api.getSourceDescription(this.tileId, this.appServices.getISO639UILang(), action.payload['corpusId'])
                    .subscribe(
                        (data) => {
                            dispatch({
                                name: GlobalActionName.GetSourceInfoDone,
                                payload: {
                                    tileId: this.tileId,
                                    data: data
                                }
                            });
                        },
                        (err) => {
                            console.error(err);
                            dispatch({
                                name: GlobalActionName.GetSourceInfoDone,
                                error: err,
                                payload: {
                                    tileId: this.tileId
                                }
                            });
                        }
                    );
                }
            }
        );

        this.addActionHandler<Actions.ZoomMouseLeave>(
            ActionName.ZoomMouseLeave,
            (state, action) => {
                if (action.payload.tileId === this.tileId) {
                    state.refArea = [null, null];
                }
            }
        );
        this.addActionHandler<Actions.ZoomMouseDown>(
            ActionName.ZoomMouseDown,
            (state, action) => {
                if (action.payload.tileId === this.tileId) {
                    state.refArea = [action.payload.value, action.payload.value];
                }
            }
        );
        this.addActionHandler<Actions.ZoomMouseMove>(
            ActionName.ZoomMouseMove,
            (state, action) => {
                if (action.payload.tileId === this.tileId) {
                    state.refArea[1] = action.payload.value;
                }
            }
        );
        this.addActionHandler<Actions.ZoomMouseUp>(
            ActionName.ZoomMouseUp,
            (state, action) => {
                if (action.payload.tileId === this.tileId) {
                    if (state.refArea[1] !== state.refArea[0]) {
                        state.zoom = state.refArea[1] > state.refArea[0] ?
                            [state.refArea[0], state.refArea[1]] :
                            [state.refArea[1], state.refArea[0]];
                    }
                    state.refArea = [null, null];
                }
            }
        );
        this.addActionHandler<Actions.ZoomReset>(
            ActionName.ZoomReset,
            (state, action) => {
                if (action.payload.tileId === this.tileId) {
                    state.zoom = [null, null]
                }
            }
        );
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

    private mergeChunks(currData:Array<DataItemWithWCI>, newChunk:Array<DataItemWithWCI>, alphaLevel:AlphaLevel):Array<DataItemWithWCI> {
        return Dict.toEntries(newChunk.reduce(
            (acc, curr) => {
                if (acc[curr.datetime] !== undefined) {
                    const tmp = acc[curr.datetime];
                    tmp.freq += curr.freq;
                    tmp.datetime = curr.datetime;
                    tmp.norm += curr.norm;
                    tmp.ipm = calcIPM(tmp, tmp.norm);
                    const confInt = wilsonConfInterval(tmp.freq, tmp.norm, alphaLevel);
                    tmp.ipmInterval = [roundFloat(confInt[0] * 1e6), roundFloat(confInt[1] * 1e6)];
                    acc[tmp.datetime] = tmp;
                    return acc;

                } else {
                    const confInt = wilsonConfInterval(curr.freq, curr.norm, alphaLevel);
                    acc[curr.datetime] = {
                        datetime: curr.datetime,
                        freq: curr.freq,
                        norm: curr.norm,
                        ipm: calcIPM(curr, curr.norm),
                        ipmInterval: [roundFloat(confInt[0] * 1e6), roundFloat(confInt[1] * 1e6)]
                    };
                    return acc;
                }
            },
            Dict.fromEntries(currData.map(v => [v.datetime, v] as [string, DataItemWithWCI]))

        )).map(([,v]) => v).sort((x1, x2) => parseInt(x1.datetime) - parseInt(x2.datetime));
    }


    private getFreqs(response:Observable<[TimeDistribResponse, DataFetchArgsOwn|DataFetchArgsForeignConc]>, seDispatch:SEDispatcher) {
        response.pipe(
            map(
                ([resp, args]) => {
                    const dataFull = resp.data.map<DataItemWithWCI>(v => ({
                        datetime: v.datetime,
                        freq: v.freq,
                        norm: v.norm,
                        ipm: -1,
                        ipmInterval: [-1, -1]
                    }));
                    let ans:DataLoadedPayload = {
                        tileId: this.tileId
                    };
                    if (args.targetId === SubchartID.MAIN) {
                        ans.data = dataFull;
                        ans.wordMainLabel = args.wordMainLabel;

                    } else if (args.targetId === SubchartID.SECONDARY) {
                        ans.dataCmp = dataFull;
                    }
                    return ans;
                }
            ),
            tap(
                data => {
                    seDispatch<GlobalActions.TilePartialDataLoaded<DataLoadedPayload>>({
                        name: GlobalActionName.TilePartialDataLoaded,
                        payload: {...data}
                    });
                }
            ),
            reduce(
                (acc, payload) => acc && (payload.dataCmp || payload.data || []).length === 0,
                true
            )
        ).subscribe(
            isEmpty => {
                seDispatch<GlobalActions.TileDataLoaded<DataLoadedPayload>>({
                    name: GlobalActionName.TileDataLoaded,
                    payload:{
                        tileId: this.tileId,
                        isEmpty: isEmpty
                    }
                });
            },
            error => {
                console.error(error);
                seDispatch<GlobalActions.TileDataLoaded<DataLoadedPayload>>({
                    name: GlobalActionName.TileDataLoaded,
                    payload: {
                        tileId: this.tileId,
                        isEmpty: true
                    },
                    error: error
                });
            }
        );
    }

    private loadConcordance(state:TimeDistribModelState, lemmaVariant:LemmaVariant, subcnames:Array<string>,
            target:SubchartID):Observable<[ConcResponse, DataFetchArgsOwn]> {
        return rxOf(...subcnames).pipe(
            mergeMap(
                (subcname) => callWithExtraVal(
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
                            concordances: [{
                                concsize: -1,
                                numPages: -1,
                                resultARF: -1,
                                resultIPM: -1,
                                currPage: 1,
                                loadPage: 1,
                                concId: null,
                                lines: []
                            }],
                            shuffle: false,
                            attr_vmode: 'mouseover',
                            viewMode: ViewMode.KWIC,
                            tileId: this.tileId,
                            attrs: ['word'],
                            metadataAttrs: [],
                            posQueryGenerator: state.posQueryGenerator,
                            queries: []
                        },
                        lemmaVariant,
                        0,
                        null
                    ),
                    {
                        concId: null,
                        subcName: subcname,
                        wordMainLabel: lemmaVariant.lemma,
                        targetId: target,
                        origQuery: mkMatchQuery(lemmaVariant, state.posQueryGenerator)
                    }
                )
            )
        );
    }

    private loadData(state:TimeDistribModelState, dispatch:SEDispatcher, target:SubchartID, lemmaVariant:Observable<LemmaVariant>):void {
        if (this.waitForTile > -1) { // in this case we rely on a concordance provided by other tile
            const proc = this.suspend(TileWait.create([this.waitForTile], () => false), (action:Action<{tileId:number}>, syncData) => {
                if (action.name === GlobalActionName.TileDataLoaded && syncData.tileIsRegistered(action.payload.tileId)) {
                    syncData.setTileDone(action.payload.tileId, true);
                }
                return syncData.next(() => true);

            }).pipe(
                concatMap(
                    action => {
                        const payload = action.payload as ConcLoadedPayload;
                        return lemmaVariant.pipe(
                            map(v => {
                                const ans:[LemmaVariant, string, string, string] = [
                                    v, payload.concPersistenceIDs[0], payload.corpusName, payload.subcorpusName];
                                return ans;
                            })
                        );
                    },
                ),
                map(
                    ([lv, concId, corpusName, subcorpName]) => {
                        return {
                            concId: concId,
                            corpName: corpusName,
                            subcName: subcorpName,
                            wordMainLabel: lv.lemma,
                            targetId: target
                        };
                    }
                ),
                tap(v => console.log('fuck: ', v)),
                concatMap(args => callWithExtraVal(
                    this.api,
                    {
                        corpName: args.corpName,
                        subcorpName: args.subcName,
                        concIdent: `~${args.concId}`
                    },
                    args
                ))
            );
            this.getFreqs(proc, dispatch);

        } else { // here we must create our own concordance(s) if needed
            const data = lemmaVariant.pipe(
                concatMap((lv:LemmaVariant) => {
                    if (lv) {
                        return this.loadConcordance(state, lv, state.subcnames, target);
                    }
                    return rxOf<[ConcResponse, DataFetchArgsOwn]>([
                        {
                            query: '',
                            corpName: state.corpname,
                            subcorpName: state.subcnames[0],
                            lines: [],
                            concsize: 0,
                            arf: 0,
                            ipm: 0,
                            messages: [],
                            concPersistenceID: null
                        },
                        {
                            concId: null,
                            subcName: state.subcnames[0],
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
            );

            this.getFreqs(data, dispatch);
        }
    }
}
