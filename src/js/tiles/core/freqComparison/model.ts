/*
 * Copyright 2018 Tomas Machalek <tomas.machalek@gmail.com>
 * Copyright 2018 Institute of the Czech National Corpus,
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
import { Action, SEDispatcher, StatelessModel, IActionQueue } from 'kombo';
import { Observable, Observer } from 'rxjs';
import { mergeMap, reduce, share } from 'rxjs/operators';

import { AppServices } from '../../../appServices';
import { GeneralMultiCritFreqComparisonModelState, stateToAPIArgs } from '../../../common/models/freqComparison';
import { Backlink, BacklinkWithArgs } from '../../../common/tile';
import { puid } from '../../../common/util';
import { ActionName as GlobalActionName, Actions as GlobalActions } from '../../../models/actions';
import { ActionName, Actions, DataLoadedPayload, LoadFinishedPayload } from './actions';
import { findCurrLemmaVariant } from '../../../models/query';
import { RecognizedQueries, LemmaVariant } from '../../../common/query';
import { ConcLoadedPayload, isConcLoadedPayload } from '../concordance/actions';
import { ConcApi, QuerySelector, mkMatchQuery } from '../../../common/api/kontext/concordance';
import { callWithExtraVal } from '../../../common/api/util';
import { ViewMode } from '../../../common/api/abstract/concordance';
import { createInitialLinesData } from '../../../common/models/concordance';
import { MultiBlockFreqDistribAPI, BacklinkArgs, DataRow } from '../../../common/api/kontext/freqs';


export interface MultiWordDataRow extends DataRow {
    word: string;
}

export interface FreqComparisonModelState extends GeneralMultiCritFreqComparisonModelState<MultiWordDataRow> {
    activeBlock:number;
    backlink:BacklinkWithArgs<BacklinkArgs>;
    isAltViewMode:boolean;
    maxChartsPerLine:number;
    posQueryGenerator:[string, string];
}

export interface FreqComparisonModelArgs {
    dispatcher:IActionQueue;
    tileId:number;
    waitForTiles:Array<number>;
    appServices:AppServices;
    concApi:ConcApi;
    freqApi:MultiBlockFreqDistribAPI;
    backlink:Backlink|null;
    initState:FreqComparisonModelState;
    lemmas:RecognizedQueries;
}


export class FreqComparisonModel extends StatelessModel<FreqComparisonModelState> {

    private readonly lemmas:RecognizedQueries;

    protected readonly concApi:ConcApi;

    protected readonly freqApi:MultiBlockFreqDistribAPI;

    protected readonly appServices:AppServices;

    protected readonly tileId:number;

    protected waitForTiles:Array<number>;

    private readonly backlink:Backlink|null;

    constructor({dispatcher, tileId, waitForTiles, appServices, concApi, freqApi, backlink, initState, lemmas}:FreqComparisonModelArgs) {
        super(dispatcher, initState);
        this.tileId = tileId;
        this.waitForTiles = waitForTiles;
        this.appServices = appServices;
        this.concApi = concApi;
        this.freqApi = freqApi;
        this.backlink = backlink;
        this.lemmas = lemmas;

        this.addActionHandler<GlobalActions.RequestQueryResponse>(
            GlobalActionName.RequestQueryResponse,
            (state, action) => {
                state.isBusy = true;
                state.error = null;
            },
            (state, action, dispatch) => {
                if (this.waitForTiles.length > 0) {
                    this.suspend({}, (action, syncData) => {
                        if (action.name === GlobalActionName.TileDataLoaded && action.payload['tileId'] === this.waitForTiles[0]) {
                            if (isConcLoadedPayload(action.payload)) {
                                const payload = (action as GlobalActions.TileDataLoaded<ConcLoadedPayload>).payload;
                                if (action.error) {
                                    dispatch<GlobalActions.TileDataLoaded<DataLoadedPayload>>({
                                        name: GlobalActionName.TileDataLoaded,
                                        payload: {
                                            tileId: this.tileId,
                                            isEmpty: true,
                                            block: null,
                                            queryId: null,
                                            lemma: null,
                                            critId: null
                                        },
                                        error: new Error(this.appServices.translate('global__failed_to_obtain_required_data')),
                                    });
                                    return null;
                                }
                                this.loadFreqs(this.composeConcordances(state, payload.concPersistenceIDs), state, dispatch);

                            } else {
                                // if foreign tile response does not send concordances, load as standalone tile
                                this.loadFreqs(this.loadConcordances(state), state, dispatch);
                            }
                            return null;
                        }
                        return syncData;
                    });

                } else {
                    this.loadFreqs(this.loadConcordances(state), state, dispatch);
                }
            }
        );
        this.addActionHandler<Actions.PartialDataLoaded<DataLoadedPayload>>(
            ActionName.PartialDataLoaded,
            (state, action) => {
                if (action.payload.tileId === this.tileId) {
                    if (action.error) {
                        state.blocks = state.fcrit.map(v => ({
                            data: [],
                            words: lemmas.map(_ => null),
                            ident: puid(),
                            isReady: false,
                            label: null
                        }))
                        state.error = action.error.message;
                        state.isBusy = false;

                    } else {
                        // data for these words were requested (some words can have no data)
                        // also data are rendered in this order of words, we order it so it corresponds to inputs
                        state.blocks[action.payload.critId].words[action.payload.queryId] = action.payload.lemma.word;
                        action.payload.block.data.forEach(data =>
                            state.blocks[action.payload.critId].data.push({
                                name: this.appServices.translateDbValue(state.corpname, data.name),
                                freq: data.freq,
                                ipm: data.ipm,
                                word: action.payload.lemma.word,
                                norm: data.norm
                            })
                        );
                        state.blocks[action.payload.critId].ident = puid();
                        state.blocks[action.payload.critId].label = this.appServices.importExternalMessage(
                            action.payload.blockLabel ?
                            action.payload.blockLabel :
                            state.critLabels[action.payload.critId]
                        );
                        state.blocks[action.payload.critId].isReady = state.blocks[action.payload.critId].words.every(word => word !== null);

                        state.isBusy = state.blocks.some(v => !v.isReady);
                        state.backlink = null;
                    }
                }
            }
        );
        this.addActionHandler<Actions.SetActiveBlock>(
            ActionName.SetActiveBlock,
            (state, action) => {
                if (action.payload.tileId === this.tileId) {
                    state.activeBlock = action.payload.idx;
                }
            }
        );
        this.addActionHandler<GlobalActions.EnableAltViewMode>(
            GlobalActionName.EnableAltViewMode,
            (state, action) => {
                if (action.payload.ident === this.tileId) {
                    state.isAltViewMode = true;
                }
            }
        );
        this.addActionHandler<GlobalActions.DisableAltViewMode>(
            GlobalActionName.DisableAltViewMode,
            (state, action) => {
                if (action.payload.ident === this.tileId) {
                    state.isAltViewMode = false;
                }
            }
        );
        this.addActionHandler<GlobalActions.GetSourceInfo>(
            GlobalActionName.GetSourceInfo,
            (state, action) => {},
            (state, action, dispatch) => {
                if (action.payload['tileId'] === this.tileId) {
                    this.freqApi.getSourceDescription(this.tileId, this.appServices.getISO639UILang(), state.corpname)
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
    };

    loadConcordances(state:FreqComparisonModelState):Observable<[{concPersistenceID:string;}, {critId:number; queryId: number; lemma:LemmaVariant; concId:string;}]> {
        return new Observable((observer:Observer<{critId:number; queryId:number; lemma:LemmaVariant}>) => {
            state.fcrit.forEach((critName, critId) => {
                this.lemmas.forEach((lemma, queryId) => {
                    observer.next({critId: critId, queryId: queryId, lemma: findCurrLemmaVariant(lemma)});
                });
            });
            observer.complete();
        }).pipe(
            mergeMap(args =>
                callWithExtraVal(
                    this.concApi,
                    this.concApi.stateToArgs(
                        {
                            querySelector: QuerySelector.CQL,
                            corpname: state.corpname,
                            otherCorpname: undefined,
                            subcname: null,
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
                            concordances: createInitialLinesData(this.lemmas.length),
                            posQueryGenerator: state.posQueryGenerator
                        },
                        args.lemma,
                        args.queryId,
                        null
                    ),
                    {
                        corpName: state.corpname,
                        subcName: null,
                        concId: null,
                        queryId: args.queryId,
                        origQuery: mkMatchQuery(args.lemma, state.posQueryGenerator),
                        critId: args.critId,
                        lemma: args.lemma
                    }
                )
            )
        )
    };

    composeConcordances(
        state:FreqComparisonModelState,
        concIds: Array<string>
    ):Observable<[{concPersistenceID:string;}, {critId:number; queryId: number; lemma:LemmaVariant; concId:string;}]> {
        return new Observable((observer:Observer<[{concPersistenceID:string;}, {critId:number; queryId: number; lemma:LemmaVariant; concId:string;}]>) => {
            state.fcrit.forEach((critName, critId) => {
                this.lemmas.forEach((lemma, queryId) => {
                    observer.next([
                        {concPersistenceID: concIds[queryId]},
                        {critId: critId, queryId: queryId, lemma: findCurrLemmaVariant(lemma), concId: concIds[queryId]}
                    ]);
                });
            });
            observer.complete();
        })
    };

    loadFreqs(
        concResp:Observable<[{concPersistenceID:string;}, {critId:number; queryId: number; lemma:LemmaVariant; concId:string;}]>,
        state:FreqComparisonModelState,
        dispatch:SEDispatcher
    ):void {
        const freqResp = concResp.pipe(
            mergeMap(([resp, args]) => {
                args.concId = resp.concPersistenceID;
                return callWithExtraVal(
                    this.freqApi,
                    stateToAPIArgs(state, resp.concPersistenceID, args.critId),
                    args
                )
            }),
            share()
        );

        freqResp.pipe(
            reduce((acc, [resp, args]) => {
                    acc.isEmpty = acc.isEmpty && resp.blocks.every(v => v.data.length === 0);
                    acc.concIds[args.queryId] = resp.concId;
                    return acc;
                },
                {isEmpty: true, concIds: this.lemmas.map(_ => null), corpname: null}
            )
        ).subscribe(
            acc => {
                dispatch<GlobalActions.TileDataLoaded<LoadFinishedPayload>>({
                    name: GlobalActionName.TileDataLoaded,
                    payload: {
                        tileId: this.tileId,
                        isEmpty: acc.isEmpty,
                        concPersistenceIDs: acc.concIds,
                        corpusName: state.corpname
                    }
                });
            }
        );

        freqResp.subscribe(
            ([resp, args]) => {
                dispatch<Actions.PartialDataLoaded<DataLoadedPayload>>({
                    name: ActionName.PartialDataLoaded,
                    payload: {
                        tileId: this.tileId,
                        block: {data: resp.blocks[0].data.sort((x1, x2) => x2.ipm - x1.ipm).slice(0, state.fmaxitems)},
                        queryId: args.queryId,
                        lemma: args.lemma,
                        critId: args.critId
                    }
                });
            },
            error => {
                dispatch<Actions.PartialDataLoaded<DataLoadedPayload>>({
                    name: ActionName.PartialDataLoaded,
                    payload: {
                        tileId: this.tileId,
                        block: null,
                        queryId: null,
                        lemma: null,
                        critId: null
                    },
                    error: error
                });
                dispatch<GlobalActions.TileDataLoaded<LoadFinishedPayload>>({
                    name: GlobalActionName.TileDataLoaded,
                    payload: {
                        tileId: this.tileId,
                        isEmpty: true,
                        corpusName: state.corpname,
                        concPersistenceIDs: null
                    },
                    error: error
                });
            }
        );
    };
}

export const factory = (
    dispatcher:IActionQueue,
    tileId:number,
    waitForTiles:Array<number>,
    appServices:AppServices,
    concApi:ConcApi,
    freqApi:MultiBlockFreqDistribAPI,
    backlink:Backlink|null,
    initState:FreqComparisonModelState,
    lemmas:RecognizedQueries) => {

    return new FreqComparisonModel({
        dispatcher,
        tileId,
        waitForTiles,
        appServices,
        concApi,
        freqApi,
        backlink,
        initState,
        lemmas
    });
}
