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
import { SEDispatcher, StatelessModel, IActionQueue } from 'kombo';
import { Observable, Observer } from 'rxjs';
import { mergeMap, reduce, share } from 'rxjs/operators';
import { Ident, pipe, List, Maths } from 'cnc-tskit';

import { IAppServices } from '../../../appServices';
import { GeneralMultiCritFreqComparisonModelState } from '../../../models/tiles/freqComparison';
import { Backlink, BacklinkWithArgs, createAppBacklink } from '../../../page/tile';
import { Actions as GlobalActions } from '../../../models/actions';
import { findCurrQueryMatch } from '../../../models/query';
import { RecognizedQueries, QueryMatch } from '../../../query/index';
import { isConcLoadedPayload } from '../concordance/actions';
import { callWithExtraVal } from '../../../api/util';
import { ViewMode, IConcordanceApi } from '../../../api/abstract/concordance';
import { createInitialLinesData } from '../../../models/tiles/concordance';
import { DataRow, IMultiBlockFreqDistribAPI } from '../../../api/abstract/freqs';
import { Actions as ConcActions } from '../concordance/actions';
import { Actions } from './actions';
import { isWebDelegateApi } from '../../../types';


export interface MultiWordDataRow extends DataRow {
    word: string;
}

export interface FreqComparisonModelState extends GeneralMultiCritFreqComparisonModelState<MultiWordDataRow> {
    subcname:string|undefined;
    activeBlock:number;
    backlinks:Array<BacklinkWithArgs<{}>>;
    isAltViewMode:boolean;
    maxChartsPerLine:number;
    posQueryGenerator:[string, string];
}

export interface FreqComparisonModelArgs {
    dispatcher:IActionQueue;
    tileId:number;
    waitForTiles:Array<number>;
    waitForTilesTimeoutSecs:number;
    appServices:IAppServices;
    concApi:IConcordanceApi<{}>;
    freqApi:IMultiBlockFreqDistribAPI<{}>;
    backlink:Backlink;
    initState:FreqComparisonModelState;
    queryMatches:RecognizedQueries;
}


export class FreqComparisonModel extends StatelessModel<FreqComparisonModelState> {

    private readonly queryMatches:RecognizedQueries;

    protected readonly concApi:IConcordanceApi<{}>;

    protected readonly freqApi:IMultiBlockFreqDistribAPI<{}>;

    protected readonly appServices:IAppServices;

    protected readonly tileId:number;

    protected waitForTiles:Array<number>;

    protected waitForTilesTimeoutSecs:number;

    private readonly backlink:Backlink;

    constructor({dispatcher, tileId, waitForTiles, waitForTilesTimeoutSecs, appServices, concApi, freqApi,
            backlink, initState, queryMatches}:FreqComparisonModelArgs) {
        super(dispatcher, initState);
        this.tileId = tileId;
        this.waitForTiles = waitForTiles;
        this.waitForTilesTimeoutSecs = waitForTilesTimeoutSecs;
        this.appServices = appServices;
        this.concApi = concApi;
        this.freqApi = freqApi;
        this.backlink = !backlink?.isAppUrl && isWebDelegateApi(this.freqApi) ? this.freqApi.getBackLink(backlink) : backlink;
        this.queryMatches = queryMatches;

        this.addActionHandler<typeof GlobalActions.RequestQueryResponse>(
            GlobalActions.RequestQueryResponse.name,
            (state, action) => {
                state.isBusy = true;
                state.error = null;
            },
            (state, action, dispatch) => {
                if (this.waitForTiles.length > 0) {
                    this.waitForActionWithTimeout(
                        this.waitForTilesTimeoutSecs * 1000,
                        {},
                        (action, syncData) => {
                            if (ConcActions.isTileDataLoaded(action) && action.payload.tileId === this.waitForTiles[0]) {
                                if (isConcLoadedPayload(action.payload)) {
                                    if (action.error) {
                                        dispatch<typeof Actions.TileDataLoaded>({
                                            name: Actions.TileDataLoaded.name,
                                            payload: {
                                                tileId: this.tileId,
                                                isEmpty: true
                                            },
                                            error: new Error(this.appServices.translate('global__failed_to_obtain_required_data')),
                                        });
                                        return null;
                                    }
                                    this.loadFreqs(
                                        this.composeConcordances(state, action.payload.concPersistenceIDs),
                                        state,
                                        dispatch
                                    );

                                } else {
                                    // if foreign tile response does not send concordances, load as standalone tile
                                    this.loadFreqs(this.loadConcordances(state), state, dispatch);
                                }
                                return null;
                            }
                            return syncData;
                        }
                    );

                } else {
                    this.loadFreqs(this.loadConcordances(state), state, dispatch);
                }
            }
        );
        this.addActionHandler<typeof Actions.PartialTileDataLoaded>(
            Actions.PartialTileDataLoaded.name,
            (state, action) => {
                if (action.payload.tileId === this.tileId) {
                    if (action.error) {
                        state.blocks = List.map(
                            v => ({
                                data: [],
                                words: List.map(_ => null, queryMatches),
                                ident: Ident.puid(),
                                isReady: false,
                                label: null
                            }),
                            state.fcrit
                        );
                        state.error = this.appServices.normalizeHttpApiError(action.error);
                        state.isBusy = false;

                    } else {
                        // data for these words were requested (some words can have no data)
                        // also data are rendered in this order of words, we order it so it corresponds to inputs
                        state.blocks[action.payload.critId].words[action.payload.queryId] = action.payload.lemma.word;
                        action.payload.block.data.forEach(data =>
                            state.blocks[action.payload.critId].data.push({
                                name: this.appServices.translateResourceMetadata(state.corpname, data.name),
                                freq: data.freq,
                                ipm: Maths.roundToPos(data.ipm, 2),
                                word: action.payload.lemma.word,
                                norm: data.norm
                            })
                        );
                        state.blocks[action.payload.critId].ident = Ident.puid();
                        state.blocks[action.payload.critId].label = this.appServices.importExternalMessage(
                            action.payload.blockLabel ?
                            action.payload.blockLabel :
                            state.critLabels[action.payload.critId]
                        );
                        state.blocks[action.payload.critId].isReady = state.blocks[action.payload.critId].words.every(word => word !== null);

                        state.isBusy = state.blocks.some(v => !v.isReady);

                        if (this.backlink?.isAppUrl) {
                            state.backlinks = [createAppBacklink(this.backlink)];
                        } else {
                            state.backlinks.push(action.payload.backlink);
                        }
                    }
                }
            }
        );
        this.addActionHandler<typeof Actions.SetActiveBlock>(
            Actions.SetActiveBlock.name,
            (state, action) => {
                if (action.payload.tileId === this.tileId) {
                    state.activeBlock = action.payload.idx;
                }
            }
        );
        this.addActionHandler<typeof GlobalActions.EnableAltViewMode>(
            GlobalActions.EnableAltViewMode.name,
            (state, action) => {
                if (action.payload.ident === this.tileId) {
                    state.isAltViewMode = true;
                }
            }
        );
        this.addActionHandler<typeof GlobalActions.DisableAltViewMode>(
            GlobalActions.DisableAltViewMode.name,
            (state, action) => {
                if (action.payload.ident === this.tileId) {
                    state.isAltViewMode = false;
                }
            }
        );
        this.addActionHandler<typeof GlobalActions.GetSourceInfo>(
            GlobalActions.GetSourceInfo.name,
            (state, action) => {},
            (state, action, dispatch) => {
                if (action.payload['tileId'] === this.tileId) {
                    this.freqApi.getSourceDescription(this.tileId, this.appServices.getISO639UILang(), state.corpname)
                    .subscribe({
                        next: (data) => {
                            dispatch<typeof GlobalActions.GetSourceInfoDone>({
                                name: GlobalActions.GetSourceInfoDone.name,
                                payload: {
                                    data
                                }
                            });
                        },
                        error: (err) => {
                            console.error(err);
                            dispatch<typeof GlobalActions.GetSourceInfoDone>({
                                name: GlobalActions.GetSourceInfoDone.name,
                                error: err
                            });
                        }
                    });
                }
            }
        );
    };

    loadConcordances(state:FreqComparisonModelState):Observable<[{concPersistenceID:string;}, {critId:number; queryId: number; lemma:QueryMatch; concId:string;}]> {
        return new Observable((observer:Observer<{critId:number; queryId:number; lemma:QueryMatch}>) => {
            state.fcrit.forEach((critName, critId) => {
                this.queryMatches.forEach((lemma, queryId) => {
                    observer.next({critId: critId, queryId: queryId, lemma: findCurrQueryMatch(lemma)});
                });
            });
            observer.complete();
        }).pipe(
            mergeMap(args =>
                callWithExtraVal(
                    this.concApi,
                    this.concApi.stateToArgs(
                        {
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
                            concordances: createInitialLinesData(this.queryMatches.length),
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
                        origQuery: this.concApi.mkMatchQuery(args.lemma, state.posQueryGenerator),
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
    ):Observable<[{concPersistenceID:string;}, {critId:number; queryId: number; lemma:QueryMatch; concId:string;}]> {
        return new Observable((observer:Observer<[{concPersistenceID:string;}, {critId:number; queryId: number; lemma:QueryMatch; concId:string;}]>) => {
            state.fcrit.forEach((critName, critId) => {
                this.queryMatches.forEach((lemma, queryId) => {
                    observer.next([
                        {concPersistenceID: concIds[queryId]},
                        {critId: critId, queryId: queryId, lemma: findCurrQueryMatch(lemma), concId: concIds[queryId]}
                    ]);
                });
            });
            observer.complete();
        })
    };

    loadFreqs(
        concResp:Observable<[{concPersistenceID:string;}, {critId:number; queryId: number; lemma:QueryMatch; concId:string;}]>,
        state:FreqComparisonModelState,
        dispatch:SEDispatcher
    ):void {
        const freqResp = concResp.pipe(
            mergeMap(([resp, args]) => {
                args.concId = resp.concPersistenceID;
                return callWithExtraVal(
                    this.freqApi,
                    this.freqApi.stateToArgs(state, resp.concPersistenceID, args.critId),
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
                {isEmpty: true, concIds: this.queryMatches.map(_ => null), corpname: null}
            )
        ).subscribe(
            acc => {
                dispatch<typeof Actions.TileDataLoaded>({
                    name: Actions.TileDataLoaded.name,
                    payload: {
                        tileId: this.tileId,
                        isEmpty: acc.isEmpty
                    }
                });
            }
        );

        freqResp.subscribe({
            next: ([resp, args]) => {
                dispatch<typeof Actions.PartialTileDataLoaded>({
                    name: Actions.PartialTileDataLoaded.name,
                    payload: {
                        tileId: this.tileId,
                        block: {
                            data: pipe(
                                resp.blocks[0].data,
                                List.sorted((x1, x2) => x2.ipm - x1.ipm),
                                List.slice(0, state.fmaxitems),
                                List.map(v => ({
                                    freq: v.freq,
                                    ipm: Maths.roundToPos(v.ipm, 2),
                                    name: v.name,
                                    norm: v.norm,
                                    order: v.order
                                }))
                            )
                        },
                        queryId: args.queryId,
                        lemma: args.lemma,
                        critId: args.critId,
                        backlink: this.freqApi.createBacklink(state, this.backlink, args.concId),
                    }
                });
            },
            error: error => {
                dispatch<typeof Actions.PartialTileDataLoaded>({
                    name: Actions.PartialTileDataLoaded.name,
                    payload: {
                        tileId: this.tileId,
                        block: null,
                        queryId: null,
                        lemma: null,
                        critId: null,
                        backlink: null,
                    },
                    error: error
                });
            }
        });
    };
}

export const factory = (
    dispatcher:IActionQueue,
    tileId:number,
    waitForTiles:Array<number>,
    waitForTilesTimeoutSecs:number,
    appServices:IAppServices,
    concApi:IConcordanceApi<{}>,
    freqApi:IMultiBlockFreqDistribAPI<{}>,
    backlink:Backlink,
    initState:FreqComparisonModelState,
    queryMatches:RecognizedQueries) => {

    return new FreqComparisonModel({
        dispatcher,
        tileId,
        waitForTiles,
        waitForTilesTimeoutSecs,
        appServices,
        concApi,
        freqApi,
        backlink,
        initState,
        queryMatches
    });
}
