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
import * as Immutable from 'immutable';
import { Action, SEDispatcher, StatelessModel, IActionQueue } from 'kombo';
import { Observable, Observer } from 'rxjs';
import { map, mergeMap, reduce } from 'rxjs/operators';

import { AppServices } from '../../../appServices';
import { BacklinkArgs, DataRow, FreqComparisonAPI, APIBlockResponse } from '../../../common/api/kontext/freqComparison';
import { FreqComparisonDataBlock, GeneralMultiCritFreqComparisonModelState, stateToAPIArgs } from '../../../common/models/freqComparison';
import { Backlink, BacklinkWithArgs } from '../../../common/tile';
import { puid } from '../../../common/util';
import { ActionName as GlobalActionName, Actions as GlobalActions } from '../../../models/actions';
import { ActionName, Actions, DataLoadedPayload, LoadFinishedPayload } from './actions';
import { findCurrLemmaVariant } from '../../../models/query';
import { RecognizedQueries, LemmaVariant } from '../../../common/query';
import { ConcLoadedPayload, isConcLoadedPayload } from '../concordance/actions';



export interface FreqComparisonModelState extends GeneralMultiCritFreqComparisonModelState<DataRow> {
    activeBlock:number;
    backlink:BacklinkWithArgs<BacklinkArgs>;
    isAltViewMode:boolean;
    maxChartsPerLine:number;
}

export interface FreqComparisonModelArgs {
    dispatcher:IActionQueue;
    tileId:number;
    waitForTiles:Array<number>;
    appServices:AppServices;
    api:FreqComparisonAPI;
    backlink:Backlink|null;
    initState:FreqComparisonModelState;
}


export class FreqComparisonModel extends StatelessModel<FreqComparisonModelState> {

    private readonly lemmas:RecognizedQueries;

    protected api:FreqComparisonAPI;

    protected readonly appServices:AppServices;

    protected readonly tileId:number;

    protected waitForTiles:Array<number>;

    private readonly backlink:Backlink|null;

    constructor({dispatcher, tileId, waitForTiles, appServices, api, backlink, initState, lemmas}) {
        super(dispatcher, initState);
        this.tileId = tileId;
        this.waitForTiles = waitForTiles;
        this.appServices = appServices;
        this.api = api;
        this.backlink = backlink;
        this.lemmas = lemmas;

        this.addActionHandler<GlobalActions.RequestQueryResponse>(
            GlobalActionName.RequestQueryResponse,
            (state, action) => {
                state.isBusy = true;
                state.error = null;
            },
            (state, action, dispatch) => {
                if (this.waitForTiles) {
                    this.suspend(
                        (action:Action) => {
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
                                        return true;
                                    }
                                    this.loadData(state, dispatch, payload.concPersistenceIDs);
                                } else {
                                    this.loadData(state, dispatch, null);
                                }
                                return true;
                            }
                            return false;
                        }
                    );
                } else {
                    this.loadData(state, dispatch, null);
                }
            }
        );
        this.addActionHandler<Actions.PartialDataLoaded<DataLoadedPayload>>(
            ActionName.PartialDataLoaded,
            (state, action) => {
                if (action.payload.tileId === this.tileId) {
                    if (action.error) {
                        state.blocks = Immutable.List<FreqComparisonDataBlock<DataRow>>(state.fcrit.map((_, i) => ({
                            data: Immutable.List<FreqComparisonDataBlock<DataRow>>(),
                            words: Immutable.List<string>(this.lemmas.map(_ => null)),
                            ident: puid(),
                            label: action.payload.blockLabel ? action.payload.blockLabel : state.critLabels.get(i),
                            isReady: false
                        })));
                        state.error = action.error.message;
                        state.isBusy = false;
    
                    } else {
                        // data for these words were requested (some words can have no data)
                        // also data are rendered in this order of words, we order it so it corresponds to inputs
                        const newWords = state.blocks.get(action.payload.critId).words.set(action.payload.queryId, action.payload.lemma.word);
                        const newData = action.payload.block.data.length === 0 ?
                            state.blocks.get(action.payload.critId).data :
                            state.blocks.get(action.payload.critId).data.concat(
                                Immutable.List<DataRow>(action.payload.block.data.map(data => ({
                                    name: this.appServices.translateDbValue(state.corpname, data.name),
                                    freq: data.freq,
                                    ipm: data.ipm,
                                    word: action.payload.lemma.word
                                })))
                            ).toList();
    
                        state.blocks = state.blocks.set(
                            action.payload.critId,
                            {
                                data: newData,
                                words: newWords,
                                ident: puid(),
                                label: this.appServices.importExternalMessage(
                                    action.payload.blockLabel ? action.payload.blockLabel : state.critLabels.get(action.payload.critId)),
                                isReady: newWords.every(word => word !== null)
                            }
                        );
    
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
                    this.api.getSourceDescription(this.tileId, this.appServices.getISO639UILang(), state.corpname)
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
    };

    loadData(state:FreqComparisonModelState, dispatch:SEDispatcher, concPersistenceIDs:Array<string>):void {
        const requests = new Observable((observer:Observer<{critId:number; queryId:number; lemma:LemmaVariant}>) => {
            state.fcrit.keySeq().forEach(critId => {
                this.lemmas.forEach((lemma, queryId) => {
                    observer.next({critId: critId, queryId: queryId, lemma: findCurrLemmaVariant(lemma)});
                });
            });
            observer.complete();
        }).pipe(
            mergeMap(args =>
                this.api.call(
                    stateToAPIArgs(state, args.critId),
                    args.lemma,
                    concPersistenceIDs ? concPersistenceIDs[args.queryId] : null
                ).pipe(
                    map(resp => [resp, args] as [APIBlockResponse, {critId:number; queryId:number; lemma:LemmaVariant}])
                )
            )
        );
        this.handleRequests(requests, state, dispatch);
    };

    handleRequests(requests:Observable<[APIBlockResponse, {critId:number; queryId:number; lemma:LemmaVariant;}]>, state:FreqComparisonModelState, dispatch:SEDispatcher):void {
        requests.pipe(
            reduce((acc, [resp, args]) => {
                    acc.isEmpty = acc.isEmpty && resp.blocks.every(v => v.data.length === 0);
                    acc.concIds[args.queryId] = resp.concId;
                    return acc;
                },
                {isEmpty: true, concIds: this.lemmas.map(_ => null)}
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

        requests.subscribe(
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
    api:FreqComparisonAPI,
    backlink:Backlink|null,
    initState:FreqComparisonModelState,
    lemmas:RecognizedQueries) => {

    return new FreqComparisonModel({
        dispatcher,
        tileId,
        waitForTiles,
        appServices,
        api,
        backlink,
        initState,
        lemmas
    });
}
