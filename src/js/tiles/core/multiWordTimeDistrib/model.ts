/*
 * Copyright 2019 Martin Zimandl <martin.zimandl@gmail.com>
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
import { SEDispatcher, StatelessModel, IActionQueue, Action } from 'kombo';
import { Observable, of as rxOf } from 'rxjs';
import { concatMap, reduce } from 'rxjs/operators';

import { AppServices } from '../../../appServices';
import { ConcApi, QuerySelector, mkMatchQuery } from '../../../common/api/kontext/concordance';
import { ConcResponse, ViewMode } from '../../../common/api/abstract/concordance';
import { TimeDistribResponse } from '../../../common/api/abstract/timeDistrib';
import { DataRow } from '../../../common/api/kontext/freqs';
import { KontextTimeDistribApi } from '../../../common/api/kontext/timeDistrib';
import { GeneralSingleCritFreqBarModelState } from '../../../common/models/freq';
import { ActionName as GlobalActionName, Actions as GlobalActions } from '../../../models/actions';
import { findCurrLemmaVariant } from '../../../models/query';
import { DataItemWithWCI, LemmaData, ActionName, Actions, LoadFinishedPayload } from './common';
import { AlphaLevel, wilsonConfInterval } from '../../../common/statistics';
import { callWithExtraVal } from '../../../common/api/util';
import { LemmaVariant, RecognizedQueries } from '../../../common/query';
import { createInitialLinesData } from '../../../common/models/concordance';
import { ConcLoadedPayload, isConcLoadedPayload } from '../concordance/actions';


export interface TimeDistribModelState extends GeneralSingleCritFreqBarModelState<LemmaData> {
    subcnames:Immutable.List<string>;
    subcDesc:string;
    alphaLevel:AlphaLevel;
    posQueryGenerator:[string, string];
    wordLabels:Immutable.List<string>;
    averagingYears:number;
    isTweakMode:boolean;
}


const roundFloat = (v:number):number => Math.round(v * 100) / 100;

const calcIPM = (v:DataRow|DataItemWithWCI, domainSize:number) => Math.round(v.freq / domainSize * 1e6 * 100) / 100;


interface DataFetchArgsOwn {
    corpName:string;
    subcName:string;
    queryId:number;
    concId:string;
    origQuery:string;
}

function isDataFetchArgsOwn(v:DataFetchArgsOwn|DataFetchArgsForeignConc): v is DataFetchArgsOwn {
    return v['origQuery'] !== undefined;
}

interface DataFetchArgsForeignConc {
    corpName:string;
    subcName:string;
    queryId:number;
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

    private unfinishedChunks:Immutable.List<Immutable.List<boolean>>;

    constructor({dispatcher, initState, tileId, waitForTile, api, concApi, appServices, lemmas, queryLang}:TimeDistribModelArgs) {
        super(dispatcher, initState);
        this.tileId = tileId;
        this.api = api;
        this.concApi = concApi;
        this.waitForTile = waitForTile;
        this.appServices = appServices;
        this.lemmas = lemmas;
        this.queryLang = queryLang;
        this.unfinishedChunks = Immutable.List(this.lemmas.map(_ => initState.subcnames.map(_ => true).toList()));

        this.addActionHandler<GlobalActions.EnableTileTweakMode>(
            GlobalActionName.EnableTileTweakMode,
            (state, action) => {
                if (action.payload.ident === this.tileId) {state.isTweakMode = true}
            }
        );
        this.addActionHandler<GlobalActions.DisableTileTweakMode>(
            GlobalActionName.DisableTileTweakMode,
            (state, action) => {
                if (action.payload.ident === this.tileId) {state.isTweakMode = false}
            }
        );
        this.addActionHandler<Actions.ChangeTimeWindow>(
            ActionName.ChangeTimeWindow,
            (state, action) => {
                if (action.payload.tileId === this.tileId) {state.averagingYears = action.payload.value}
            }
        );
        this.addActionHandler<GlobalActions.RequestQueryResponse>(
            GlobalActionName.RequestQueryResponse,
            (state, action) => {
                this.unfinishedChunks = Immutable.List(this.lemmas.map(_ => this.getState().subcnames.map(_ => true).toList()));
                state.data = Immutable.List(this.lemmas.map(_ => Immutable.List<DataItemWithWCI>()));
                state.isBusy = true;
                state.error = null;
            },
            (state, action, dispatch) => {
                // we can propagate concordances only for one corpus (subcorpus)
                if (this.waitForTile > -1 && state.subcnames.size === 1) {
                    this.suspend((action:Action) => {
                        if (action.name === GlobalActionName.TileDataLoaded && action.payload['tileId'] === this.waitForTile) {
                            if (isConcLoadedPayload(action.payload)) {
                                const payload = (action as GlobalActions.TileDataLoaded<ConcLoadedPayload>).payload;
                                this.loadData(
                                    state,
                                    dispatch,
                                    [null],
                                    rxOf(...this.lemmas.map((lemma, queryId) => ({
                                        queryId: queryId,
                                        lemma: findCurrLemmaVariant(lemma),
                                        concId: payload.concPersistenceIDs[queryId]
                                    }))) as Observable<{queryId:number; lemma:LemmaVariant; concId:string;}>
                                );
                            } else {
                                this.loadData(
                                    state,
                                    dispatch,
                                    state.subcnames.toArray(),
                                    rxOf(...this.lemmas.map((lemma, queryId) => ({
                                        queryId: queryId,
                                        lemma: findCurrLemmaVariant(lemma),
                                        concId: null
                                    }))) as Observable<{queryId:number; lemma:LemmaVariant; concId:string;}>
                                );
                            }
                            return true;
                        }
                        return false;
                    });

                } else {
                    this.loadData(
                        state,
                        dispatch,
                        state.subcnames.toArray(),
                        rxOf(...this.lemmas.map((lemma, queryId) => ({
                            queryId: queryId,
                            lemma: findCurrLemmaVariant(lemma),
                            concId: null
                        }))) as Observable<{queryId:number; lemma:LemmaVariant; concId:string;}>
                    );
                }
            }
        );
        this.addActionHandler<Actions.PartialDataLoaded>(
            ActionName.PartialDataLoaded,
            (state, action) => {
                if (action.payload.tileId === this.tileId) {
                    const subcIndex = state.subcnames.findIndex(v => v === action.payload.subcname);
                    this.unfinishedChunks = this.unfinishedChunks.set(
                        action.payload.queryId,
                        this.unfinishedChunks.get(action.payload.queryId).set(subcIndex, false)
                    );
                    let newData:Immutable.List<DataItemWithWCI>;
                    if (action.error) {
                        newData = Immutable.List<DataItemWithWCI>();
                    } else {
                        const currentData = state.data.get(action.payload.queryId, newData) || Immutable.List<DataItemWithWCI>();
                        newData = this.mergeChunks(currentData, Immutable.List<DataItemWithWCI>(action.payload.data), state.alphaLevel);
                    }
                    state.data = state.data.set(action.payload.queryId, newData);
                }
            }
        );
        this.addActionHandler<GlobalActions.TileDataLoaded<LoadFinishedPayload>>(
            GlobalActionName.TileDataLoaded,
            (state, action) => {
                if (action.payload.tileId === this.tileId) {
                    state.isBusy = false;
                    if (action.error) {
                        state.error = action.error.message;
                    }
                }
            }
        );
        this.addActionHandler<GlobalActions.GetSourceInfo>(
            GlobalActionName.GetSourceInfo,
            (state, action) => {},
            (state, action, dispatch) => {
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
            }
        );
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

                seDispatch<Actions.PartialDataLoaded>({
                    name: ActionName.PartialDataLoaded,
                    payload: {
                        tileId: this.tileId,
                        data: dataFull,
                        subcname: resp.subcorpName,
                        concId: args.concId,
                        queryId: args.queryId,
                        origQuery: isDataFetchArgsOwn(args) ? args.origQuery : ''
                    }
                });
            },
            error => {
                console.error(error);
                seDispatch<Actions.PartialDataLoaded>({
                    name: ActionName.PartialDataLoaded,
                    payload: {
                        tileId: this.tileId,
                        data: null,
                        subcname: null,
                        concId: null,
                        queryId: null,
                        origQuery: null
                    },
                    error: error
                });
            }
        );
    }

    private handleFinish(state: TimeDistribModelState, response:Observable<[TimeDistribResponse, DataFetchArgsOwn|DataFetchArgsForeignConc]>, seDispatch:SEDispatcher) {
        response.pipe(
            reduce(
                (acc, [resp, args]) => {
                    acc.isEmpty = acc.isEmpty && resp.data.length === 0;
                    acc.concIds[args.queryId] = args.concId;
                    return acc
                },
                {isEmpty: true, concIds: this.lemmas.map(_ => null)}
            )
        ).subscribe(
            data =>
                seDispatch<GlobalActions.TileDataLoaded<LoadFinishedPayload>>({
                    name: GlobalActionName.TileDataLoaded,
                    payload: {
                        tileId: this.tileId,
                        isEmpty: data.isEmpty,
                        corpusName: state.corpname,
                        concPersistenceIDs: state.subcnames.size > 1 ? undefined : data.concIds
                    }
                }),
            error =>
                seDispatch<GlobalActions.TileDataLoaded<LoadFinishedPayload>>({
                    name: GlobalActionName.TileDataLoaded,
                    payload: {
                        tileId: this.tileId,
                        isEmpty: true,
                        corpusName: state.corpname,
                        concPersistenceIDs: undefined
                    },
                    error: error
                }),
        );
    }

    private loadConcordance(state:TimeDistribModelState, lemmaVariant:LemmaVariant, subcname:string,
            queryId:number):Observable<[ConcResponse, DataFetchArgsOwn]> {
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
                    shuffle: false,
                    attr_vmode: 'mouseover',
                    viewMode: ViewMode.KWIC,
                    tileId: this.tileId,
                    attrs: [],
                    metadataAttrs: [],
                    queries: [],
                    posQueryGenerator: state.posQueryGenerator,
                    concordances: createInitialLinesData(this.lemmas.length)
                },
                lemmaVariant,
                queryId,
                null
            ),
            {
                corpName: state.corpname,
                subcName: subcname,
                concId: null,
                queryId: queryId,
                origQuery: mkMatchQuery(lemmaVariant, state.posQueryGenerator)
            }
        );
    }

    private loadData(state:TimeDistribModelState, dispatch:SEDispatcher, subcNames:Array<string>, lemmaVariant:Observable<{queryId:number; lemma:LemmaVariant; concId:string;}>):void {
        subcNames.map(subcName =>
            lemmaVariant.pipe(
                concatMap(args => {
                    if (!args.concId) {
                        return this.loadConcordance(state, args.lemma, subcName, args.queryId);
                    }
                    return rxOf<[ConcResponse, DataFetchArgsOwn]>([
                        {
                            query: '',
                            corpName: state.corpname,
                            subcorpName: subcName,
                            lines: [],
                            concsize: 0,
                            arf: 0,
                            ipm: 0,
                            messages: [],
                            concPersistenceID: args.concId
                        },
                        {
                            corpName: state.corpname,
                            subcName: subcName,
                            concId: args.concId,
                            queryId: args.queryId,
                            origQuery: ''
                        }
                    ]);
                }),
                concatMap(
                    ([concResp, args]) => {
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
            this.handleFinish(state, resp, dispatch);
        });
    }
}