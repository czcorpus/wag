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
import { reduce, map, tap, mergeMap } from 'rxjs/operators';
import { Dict, Maths, List, pipe } from 'cnc-tskit';

import { IAppServices } from '../../../appServices';
import { ConcResponse, ViewMode, IConcordanceApi } from '../../../api/abstract/concordance';
import { TimeDistribResponse, TimeDistribItem, TimeDistribApi } from '../../../api/abstract/timeDistrib';
import { GeneralSingleCritFreqMultiQueryState } from '../../../models/tiles/freq';
import { Actions as GlobalActions } from '../../../models/actions';
import { findCurrQueryMatch } from '../../../models/query';
import { DataItemWithWCI, Actions, DataLoadedPayload } from './common';
import { callWithExtraVal } from '../../../api/util';
import { QueryMatch, RecognizedQueries } from '../../../query/index';
import { createInitialLinesData } from '../../../models/tiles/concordance';
import { PriorityValueFactory } from '../../../priority';
import { DataRow } from '../../../api/abstract/freqs';
import { Actions as ConcActions } from '../concordance/actions';
import { Backlink, BacklinkWithArgs, createAppBacklink } from '../../../page/tile';
import { isWebDelegateApi } from '../../../types';


export interface MultiWordTimeDistribModelState extends GeneralSingleCritFreqMultiQueryState<DataItemWithWCI> {
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
    backlinks:Array<BacklinkWithArgs<{}>>;
}


const roundFloat = (v:number):number => Math.round(v * 100) / 100;

const calcIPM = (v:DataRow|DataItemWithWCI, domainSize:number) => Math.round(v.freq / domainSize * 1e6 * 100) / 100;


export interface MultiWordTimeDistribModelArgs {
    dispatcher:IActionQueue;
    initState:MultiWordTimeDistribModelState;
    tileId:number;
    waitForTile:number;
    waitForTilesTimeoutSecs:number;
    apiFactory:PriorityValueFactory<[IConcordanceApi<{}>, TimeDistribApi]>;
    appServices:IAppServices;
    queryMatches:RecognizedQueries;
    queryDomain:string;
    backlink:Backlink;
}

interface CalcArgs {
    queryId:number;
    lemma:QueryMatch;
    concId:string;
}

export interface DataFetchArgs {
    corpName:string;
    subcName:string;
    concId:string;
    queryId:number;
    origQuery:string;
    freqApi:TimeDistribApi;
}

/**
 *
 */
export class MultiWordTimeDistribModel extends StatelessModel<MultiWordTimeDistribModelState> {

    private readonly apiFactory:PriorityValueFactory<[IConcordanceApi<{}>, TimeDistribApi]>;

    private readonly appServices:IAppServices;

    private readonly tileId:number;

    private readonly waitForTile:number;

    private readonly waitForTilesTimeoutSecs:number;

    private readonly queryMatches:RecognizedQueries;

    private readonly backlink:Backlink;

    constructor({dispatcher, initState, tileId, waitForTile, waitForTilesTimeoutSecs,
            apiFactory, appServices, queryMatches, backlink}:MultiWordTimeDistribModelArgs) {
        super(dispatcher, initState);
        this.tileId = tileId;
        this.apiFactory = apiFactory;
        this.waitForTile = waitForTile;
        this.waitForTilesTimeoutSecs = waitForTilesTimeoutSecs;
        this.appServices = appServices;
        this.queryMatches = queryMatches;
        this.backlink = backlink;

        this.addActionHandler<typeof Actions.ZoomMouseLeave>(
            Actions.ZoomMouseLeave.name,
            (state, action) => {
                if (action.payload.tileId === this.tileId) {
                    state.refArea = [null, null];
                }
            }
        );
        this.addActionHandler<typeof Actions.ZoomMouseDown>(
            Actions.ZoomMouseDown.name,
            (state, action) => {
                if (action.payload.tileId === this.tileId) {
                    state.refArea = [action.payload.value, action.payload.value];
                }
            }
        );
        this.addActionHandler<typeof Actions.ZoomMouseMove>(
            Actions.ZoomMouseMove.name,
            (state, action) => {
                if (action.payload.tileId === this.tileId) {
                    state.refArea[1] = action.payload.value;
                }
            }
        );
        this.addActionHandler<typeof Actions.ZoomMouseUp>(
            Actions.ZoomMouseUp.name,
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
        this.addActionHandler<typeof Actions.ZoomReset>(
            Actions.ZoomReset.name,
            (state, action) => {
                if (action.payload.tileId === this.tileId) {
                    state.zoom = [null, null]
                }
            }
        );
        this.addActionHandler<typeof GlobalActions.EnableTileTweakMode>(
            GlobalActions.EnableTileTweakMode.name,
            (state, action) => {
                if (action.payload.ident === this.tileId) {state.isTweakMode = true}
            }
        );
        this.addActionHandler<typeof GlobalActions.DisableTileTweakMode>(
            GlobalActions.DisableTileTweakMode.name,
            (state, action) => {
                if (action.payload.ident === this.tileId) {state.isTweakMode = false}
            }
        );
        this.addActionHandler<typeof Actions.ChangeTimeWindow>(
            Actions.ChangeTimeWindow.name,
            (state, action) => {
                if (action.payload.tileId === this.tileId) {state.averagingYears = action.payload.value}
            }
        );
        this.addActionHandler<typeof Actions.ChangeUnits>(
            Actions.ChangeUnits.name,
            (state, action) => {
                if (action.payload.tileId === this.tileId) {state.units = action.payload.units}
            }
        );
        this.addActionHandler<typeof GlobalActions.RequestQueryResponse>(
            GlobalActions.RequestQueryResponse.name,
            (state, action) => {
                state.data = List.map(_ => [], this.queryMatches);
                state.isBusy = true;
                state.error = null;
            },
            (state, action, dispatch) => {
                // we can propagate concordances only for one corpus (subcorpus)
                if (this.waitForTile > -1 && state.subcnames.length === 1) {
                    this.suspendWithTimeout(
                        this.waitForTilesTimeoutSecs,
                        {},
                        (action, syncData) => {
                            if (ConcActions.isTileDataLoaded(action) && action.payload.tileId === this.waitForTile) {
                                this.loadData(
                                    state,
                                    dispatch,
                                    [null],
                                    rxOf<CalcArgs[]>(...List.map(
                                        (lemma, queryId) => {
                                            return {
                                                queryId,
                                                lemma: findCurrQueryMatch(lemma),
                                                concId: action.payload.concPersistenceIDs[queryId],
                                            }
                                        },
                                        this.queryMatches))
                                );
                                return null;
                            }
                            return syncData;
                        }
                    );

                } else {
                    this.loadData(
                        state,
                        dispatch,
                        state.subcnames,
                        rxOf<CalcArgs[]>(
                            ...List.map(
                                (lemma, queryId) => {
                                    return {
                                        queryId,
                                        lemma: findCurrQueryMatch(lemma),
                                        concId: null
                                    }
                                },
                                this.queryMatches
                        ))
                    );
                }
            }
        );

        this.addActionHandler<typeof Actions.TileDataLoaded>(
            Actions.TileDataLoaded.name,
            (state, action) => {
                if (action.payload.tileId === this.tileId) {
                    state.isBusy = false;
                    if (action.error) {
                        state.error = this.appServices.normalizeHttpApiError(action.error);
                    }
                }
            }
        );

        this.addActionHandler<typeof Actions.PartialTileDataLoaded>(
            Actions.PartialTileDataLoaded.name,
            (state, action) => {
                if (action.payload.tileId === this.tileId) {
                    const newData:Array<DataItemWithWCI> = action.error ?
                        [] :
                        this.mergeChunks(
                            state.data[action.payload.queryId] || [],
                            action.payload.data,
                            state.alphaLevel
                        );
                    state.data[action.payload.queryId] = newData;
                    if (this.backlink?.isAppUrl) {
                        state.backlinks = [createAppBacklink(this.backlink)];
                    } else if (action.payload.backlink !== null) {
                        state.backlinks.push(action.payload.backlink)
                    }
                }
            }
        );

        this.addActionHandler<typeof GlobalActions.GetSourceInfo>(
            GlobalActions.GetSourceInfo.name,
            (state, action) => {},
            (state, action, dispatch) => {
                if (action.payload.tileId === this.tileId) {
                    const [concApi,] = this.apiFactory.getHighestPriorityValue();
                    concApi.getSourceDescription(
                        this.tileId,
                        this.appServices.getISO639UILang(),
                        action.payload.corpusId

                    ).subscribe(
                        (data) => {
                            dispatch({
                                name: GlobalActions.GetSourceInfoDone.name,
                                payload: {
                                    tileId: this.tileId,
                                    data: data
                                }
                            });
                        },
                        (err) => {
                            console.error(err);
                            dispatch({
                                name: GlobalActions.GetSourceInfoDone.name,
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
        return pipe(
            newChunk,
            List.foldl(
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
                pipe(
                    currData,
                    List.map(v => [v.datetime, v] as [string, DataItemWithWCI]),
                    Dict.fromEntries()
                )
            ),
            Dict.toEntries(),
            List.map(([,v]) => v),
            List.sorted((x1, x2) => parseInt(x1.datetime) - parseInt(x2.datetime))
        )
    }

    private getFreqs(response:Observable<[TimeDistribResponse, DataFetchArgs]>, seDispatch:SEDispatcher) {
        response.pipe(
            map<[TimeDistribResponse, DataFetchArgs], DataLoadedPayload>(data => {
                const [resp, args] = data;

                const dataFull = List.map<TimeDistribItem, DataItemWithWCI>(
                    v => ({
                        datetime: v.datetime,
                        freq: v.freq,
                        norm: v.norm,
                        ipm: -1,
                        ipmInterval: [-1, -1]
                    }),
                    resp.data
                );

                return {
                    tileId: this.tileId,
                    data: dataFull,
                    queryId: args.queryId,
                    origQuery: args.origQuery,
                    backlink: isWebDelegateApi(args.freqApi) ?
                            args.freqApi.createBackLink(args.freqApi.getBackLink(this.backlink), resp.corpName, args.concId) :
                            args.freqApi.createBackLink(this.backlink, resp.corpName, args.concId) 
                };
            }),
            tap(
                data => {
                    seDispatch<typeof Actions.PartialTileDataLoaded>({
                        name: Actions.PartialTileDataLoaded.name,
                        payload: { ... data}
                    });
                }
            ),
            reduce(
                (acc, v) => acc && v.data.length === 0,
                true
            )
        ).subscribe(
            (isEmpty) => {
                seDispatch<typeof Actions.TileDataLoaded>({
                    name: Actions.TileDataLoaded.name,
                    payload:{
                        tileId: this.tileId,
                        isEmpty,
                        queryId: -1,
                        data: [],
                        origQuery: '',
                        backlink: null,
                    }
                });
            },
            error => {
                console.error(error);
                seDispatch<typeof Actions.TileDataLoaded>({
                    name: Actions.TileDataLoaded.name,
                    payload: {
                        tileId: this.tileId,
                        data: [],
                        isEmpty: true,
                        queryId: -1,
                        origQuery: '',
                        backlink: null,
                    },
                    error: error
                });
            }
        );
    }

    private loadConcordance(state:MultiWordTimeDistribModelState, lemmaVariant:QueryMatch, subcnames:Array<string>,
            queryId:number):Observable<[ConcResponse, DataFetchArgs]> {
        return rxOf<string[]>(...subcnames).pipe(
            mergeMap(
                subcname => {
                    const [concApi, freqApi] = this.apiFactory.getRandomValue();
                    return callWithExtraVal(
                        concApi,
                        concApi.stateToArgs(
                            {
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
                                concordances: createInitialLinesData(this.queryMatches.length)
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
                            origQuery: concApi.mkMatchQuery(lemmaVariant, state.posQueryGenerator),
                            freqApi
                        }
                    )
                }
            )
        );
    }

    private loadData(state:MultiWordTimeDistribModelState, dispatch:SEDispatcher, subcNames:Array<string>, lemmaVariant:Observable<CalcArgs>):void {
        const resp = lemmaVariant.pipe(
            mergeMap(args => {
                 if (args.concId) {
                    const [concApi, freqApi] = this.apiFactory.getRandomValue();
                    rxOf<[ConcResponse, DataFetchArgs]>([
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
                            origQuery: concApi.mkMatchQuery(args.lemma, state.posQueryGenerator),
                            freqApi: freqApi
                        }
                    ])
                 } else {
                    return this.loadConcordance(state, args.lemma, subcNames, args.queryId);
                 }
            }),
            mergeMap(
                ([concResp, args]) => {
                    args.concId = concResp.concPersistenceID;
                    if (args.concId) {
                        return callWithExtraVal(
                            args.freqApi,
                            {
                                corpName: state.corpname,
                                subcorpName: args.subcName,
                                concIdent: args.concId
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