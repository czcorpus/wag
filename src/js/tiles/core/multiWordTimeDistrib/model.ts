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
import { Observable, of as rxOf } from 'rxjs';
import { concatMap } from 'rxjs/operators';

import { AppServices } from '../../../appServices';
import { ConcApi, QuerySelector, mkMatchQuery } from '../../../common/api/kontext/concordance';
import { ConcResponse, ViewMode } from '../../../common/api/abstract/concordance';
import { TimeDistribResponse } from '../../../common/api/abstract/timeDistrib';
import { DataRow } from '../../../common/api/kontext/freqs';
import { KontextTimeDistribApi } from '../../../common/api/kontext/timeDistrib';
import { GeneralSingleCritFreqBarModelState } from '../../../common/models/freq';
import { ActionName as GlobalActionName, Actions as GlobalActions } from '../../../models/actions';
import { findCurrLemmaVariant } from '../../../models/query';
import { DataItemWithWCI, DataLoadedPayload, LemmaData } from './common';
import { AlphaLevel, wilsonConfInterval } from './stat';
import { callWithExtraVal } from '../../../common/api/util';
import { LemmaVariant, RecognizedQueries } from '../../../common/query';
import { Backlink, BacklinkWithArgs } from '../../../common/tile';
import { HTTPMethod } from '../../../common/types';


export interface BacklinkArgs {
    corpname:string;
    usesubcorp:string;
    q?:string;
    cql?:string;
    queryselector?:'cqlrow';
}

export interface TimeDistribModelState extends GeneralSingleCritFreqBarModelState<LemmaData> {
    subcnames:Immutable.List<string>;
    subcDesc:string;
    alphaLevel:AlphaLevel;
    posQueryGenerator:[string, string];
    wordLabels:Immutable.List<string>;
    backlink:BacklinkWithArgs<BacklinkArgs>;
}


const roundFloat = (v:number):number => Math.round(v * 100) / 100;

const calcIPM = (v:DataRow|DataItemWithWCI, domainSize:number) => Math.round(v.freq / domainSize * 1e6 * 100) / 100;


interface DataFetchArgsOwn {
    subcName:string;
    targetId:number;
    concId:string;
    origQuery:string;
}

function isDataFetchArgsOwn(v:DataFetchArgsOwn|DataFetchArgsForeignConc): v is DataFetchArgsOwn {
    return v['origQuery'] !== undefined;
}

interface DataFetchArgsForeignConc {
    subcName:string;
    targetId:number;
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
export class TimeDistribModel extends StatelessModel<TimeDistribModelState> {

    private readonly api:KontextTimeDistribApi;

    private readonly concApi:ConcApi|null;

    private readonly appServices:AppServices;

    private readonly tileId:number;

    private readonly waitForTile:number;

    private readonly lemmas:RecognizedQueries;

    private readonly queryLang:string;

    private readonly backlink:Backlink;

    private unfinishedChunks:Immutable.List<boolean>;

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
        this.unfinishedChunks = Immutable.List(this.lemmas.map(_ => true));

        this.actionMatch = {
            [GlobalActionName.RequestQueryResponse]: (state, action:GlobalActions.RequestQueryResponse) => {
                this.unfinishedChunks = Immutable.List(this.lemmas.map(_ => true));
                const newState = this.copyState(state);
                newState.data = Immutable.List<LemmaData>();
                newState.isBusy = true;
                newState.error = null;
                return newState;
            },
            [GlobalActionName.TileDataLoaded]: (state, action:GlobalActions.TileDataLoaded<DataLoadedPayload>) => {
                if (action.payload.tileId === this.tileId) {
                    const newState = this.copyState(state);
                    this.unfinishedChunks = this.unfinishedChunks.set(action.payload.subchartId, false);
                    let newData:Immutable.List<DataItemWithWCI>;
                    if (action.error) {
                        newData = Immutable.List<DataItemWithWCI>();
                        newState.error = action.error.message;
                    } else {
                        const currentData = newState.data.get(action.payload.subchartId, newData) || Immutable.List<DataItemWithWCI>();
                        newData = this.mergeChunks(currentData, Immutable.List<DataItemWithWCI>(action.payload.data), state.alphaLevel);
                    }
                    newState.isBusy = this.unfinishedChunks.includes(true);
                    newState.data = newState.data.set(action.payload.subchartId, newData);
                    newState.backlink = this.createBackLink(newState, action.payload.concId, action.payload.origQuery);
                    
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
                        origQuery: isDataFetchArgsOwn(args) ? args.origQuery : ''
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
                        origQuery: null
                    },
                    error: error
                });
            }
        );
    }

    private loadConcordance(state:TimeDistribModelState, lemmaVariant:LemmaVariant, subcname:string,
            target:number):Observable<[ConcResponse, DataFetchArgsOwn]> {
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
                targetId: target,
                origQuery: mkMatchQuery(lemmaVariant, state.posQueryGenerator)
            }
        );
    }

    private loadData(state:TimeDistribModelState, dispatch:SEDispatcher, lemmaVariant:Observable<[number, LemmaVariant]>):void {
        state.subcnames.toArray().map(subcname =>
            lemmaVariant.pipe(
                concatMap(([target, lv]) => {
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

    sideEffects(state:TimeDistribModelState, action:Action, dispatch:SEDispatcher):void {
        switch (action.name) {
            case GlobalActionName.RequestQueryResponse: {                
                this.loadData(
                    state,
                    dispatch,
                    rxOf(...this.lemmas.map((lemma, index) => [index, findCurrLemmaVariant(lemma)]).toArray()) as Observable<[number, LemmaVariant]>
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