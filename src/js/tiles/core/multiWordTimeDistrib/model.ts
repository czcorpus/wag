/*
 * Copyright 2019 Martin Zimandl <martin.zimandl@gmail.com>
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
import { SEDispatcher, StatelessModel, IActionQueue } from 'kombo';
import { Observable, of as rxOf } from 'rxjs';
import { concatMap, reduce, map, tap } from 'rxjs/operators';
import { Dict, Maths } from 'cnc-tskit';

import { AppServices } from '../../../appServices';
import { ConcApi, QuerySelector, mkMatchQuery } from '../../../common/api/kontext/concordance';
import { ConcResponse, ViewMode } from '../../../common/api/abstract/concordance';
import { TimeDistribResponse } from '../../../common/api/abstract/timeDistrib';
import { DataRow } from '../../../common/api/kontext/freqs';
import { KontextTimeDistribApi } from '../../../common/api/kontext/timeDistrib';
import { GeneralSingleCritFreqMultiQueryState } from '../../../common/models/freq';
import { ActionName as GlobalActionName, Actions as GlobalActions } from '../../../models/actions';
import { findCurrLemmaVariant } from '../../../models/query';
import { DataItemWithWCI, ActionName, Actions, DataLoadedPayload, DataFetchArgs } from './common';
import { callWithExtraVal } from '../../../common/api/util';
import { LemmaVariant, RecognizedQueries } from '../../../common/query';
import { createInitialLinesData } from '../../../common/models/concordance';
import { ConcLoadedPayload, isConcLoadedPayload } from '../concordance/actions';


export interface TimeDistribModelState extends GeneralSingleCritFreqMultiQueryState<DataItemWithWCI> {
    subcnames:Array<string>;
    subcDesc:string;
    alphaLevel:Maths.AlphaLevel;
    posQueryGenerator:[string, string];
    wordLabels:Array<string>;
    averagingYears:number;
    isTweakMode:boolean;
    units:string;
    refArea:[number,number];
    zoom:[number, number];
}


const roundFloat = (v:number):number => Math.round(v * 100) / 100;

const calcIPM = (v:DataRow|DataItemWithWCI, domainSize:number) => Math.round(v.freq / domainSize * 1e6 * 100) / 100;


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

    constructor({dispatcher, initState, tileId, waitForTile, api, concApi, appServices, lemmas}:TimeDistribModelArgs) {
        super(dispatcher, initState);
        this.tileId = tileId;
        this.api = api;
        this.concApi = concApi;
        this.waitForTile = waitForTile;
        this.appServices = appServices;
        this.lemmas = lemmas;

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
        this.addActionHandler<Actions.ChangeUnits>(
            ActionName.ChangeUnits,
            (state, action) => {
                if (action.payload.tileId === this.tileId) {state.units = action.payload.units}
            }
        );
        this.addActionHandler<GlobalActions.RequestQueryResponse>(
            GlobalActionName.RequestQueryResponse,
            (state, action) => {
                state.data = this.lemmas.map(_ => []);
                state.isBusy = true;
                state.error = null;
            },
            (state, action, dispatch) => {
                // we can propagate concordances only for one corpus (subcorpus)
                if (this.waitForTile > -1 && state.subcnames.length === 1) {
                    this.suspend({}, (action, syncData) => {
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
                                    state.subcnames,
                                    rxOf(...this.lemmas.map((lemma, queryId) => ({
                                        queryId: queryId,
                                        lemma: findCurrLemmaVariant(lemma),
                                        concId: null
                                    }))) as Observable<{queryId:number; lemma:LemmaVariant; concId:string;}>
                                );
                            }
                            return null;
                        }
                        return syncData;
                    });

                } else {
                    this.loadData(
                        state,
                        dispatch,
                        state.subcnames,
                        rxOf(...this.lemmas.map((lemma, queryId) => ({
                            queryId: queryId,
                            lemma: findCurrLemmaVariant(lemma),
                            concId: null
                        }))) as Observable<{queryId:number; lemma:LemmaVariant; concId:string;}>
                    );
                }
            }
        );
        this.addActionHandler<GlobalActions.TileDataLoaded<DataLoadedPayload>>(
            GlobalActionName.TileDataLoaded,
            (state, action) => {
                if (action.payload.tileId === this.tileId) {
                    if (action.payload.isLast) {
                        state.isBusy = false;
                    }
                    if (action.error) {
                        state.error = action.error.message;
                        state.data = [];

                    } else {
                        const newData:Array<DataItemWithWCI> = action.error ?
                            [] :
                            this.mergeChunks(
                                state.data[action.payload.queryId] || [],
                                action.payload.data,
                                state.alphaLevel
                            );
                        state.data[action.payload.queryId] = newData;
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
                                paylod: {
                                    tileId: this.tileId
                                }
                            });
                        }
                    );
                }
            }
        );
    }

    private mergeChunks(currData:Array<DataItemWithWCI>, newChunk:Array<DataItemWithWCI>, alphaLevel:Maths.AlphaLevel):Array<DataItemWithWCI> {
        return Dict.toEntries(newChunk.reduce(
            (acc, curr) => {
                if (acc[curr.datetime] !== undefined) {
                    const tmp = acc[curr.datetime];
                    tmp.freq += curr.freq;
                    tmp.datetime = curr.datetime;
                    tmp.norm += curr.norm;
                    tmp.ipm = calcIPM(tmp, tmp.norm);
                    const confInt = Maths.wilsonConfInterval(tmp.freq, tmp.norm, alphaLevel);
                    tmp.ipmInterval = [roundFloat(confInt[0] * 1e6), roundFloat(confInt[1] * 1e6)];
                    acc[tmp.datetime] = tmp;
                    return acc;

                } else {
                    const confInt = Maths.wilsonConfInterval(curr.freq, curr.norm, alphaLevel);
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

        )).map(([d, v]) => v).sort((x1, x2) => parseInt(x1.datetime) - parseInt(x2.datetime));
    }

    private getFreqs(response:Observable<[TimeDistribResponse, DataFetchArgs]>, seDispatch:SEDispatcher) {
        response.pipe(
            map<[TimeDistribResponse, DataFetchArgs], DataLoadedPayload>(data => {
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

                return {
                    tileId: this.tileId,
                    isLast: false,
                    data: dataFull,
                    queryId: args.queryId,
                    origQuery: args.origQuery
                };
            }),
            tap(
                data => {
                    seDispatch<GlobalActions.TileDataLoaded<DataLoadedPayload>>({
                        name: GlobalActionName.TileDataLoaded,
                        payload: { ... data, isEmpty: data.data.length === 0}
                    });
                }
            ),
            reduce(
                (acc, v) => acc && v.data.length === 0,
                true
            )
        ).subscribe(
            (isEmpty) => {
                seDispatch<GlobalActions.TileDataLoaded<DataLoadedPayload>>({
                    name: GlobalActionName.TileDataLoaded,
                    payload:{
                        tileId: this.tileId,
                        isEmpty: isEmpty,
                        isLast: true,
                        queryId: -1,
                        data: [],
                        origQuery: ''
                    }
                });
            },
            error => {
                console.error(error);
                seDispatch<GlobalActions.TileDataLoaded<DataLoadedPayload>>({
                    name: GlobalActionName.TileDataLoaded,
                    payload: {
                        tileId: this.tileId,
                        data: [],
                        isEmpty: true,
                        isLast: false,
                        queryId: -1,
                        origQuery: ''
                    },
                    error: error
                });
            }
        );
    }

    private loadConcordance(state:TimeDistribModelState, lemmaVariant:LemmaVariant, subcnames:Array<string>,
            queryId:number):Observable<[ConcResponse, DataFetchArgs]> {
        return rxOf<string>(...subcnames).pipe(
            concatMap(
                subcname => callWithExtraVal(
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
                )
            )
        );
    }

    private loadData(state:TimeDistribModelState, dispatch:SEDispatcher, subcNames:Array<string>, lemmaVariant:Observable<{queryId:number; lemma:LemmaVariant; concId:string;}>):void {
        const resp = lemmaVariant.pipe(
            concatMap(args => {
                if (!args.concId) {
                    return this.loadConcordance(state, args.lemma, subcNames, args.queryId);
                }
                return rxOf<[ConcResponse, DataFetchArgs]>([
                    {
                        query: '',
                        corpName: state.corpname,
                        subcorpName: subcNames[0],
                        lines: [],
                        concsize: 0,
                        arf: 0,
                        ipm: 0,
                        messages: [],
                        concPersistenceID: args.concId
                    },
                    {
                        corpName: state.corpname,
                        subcName: subcNames[0],
                        concId: args.concId,
                        queryId: args.queryId,
                        origQuery: mkMatchQuery(args.lemma, state.posQueryGenerator)
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
                        return rxOf<[TimeDistribResponse, DataFetchArgs]>([
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
        this.getFreqs(resp, dispatch);
    }
}