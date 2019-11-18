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
import { map, mergeMap, scan } from 'rxjs/operators';

import { AppServices } from '../../../appServices';
import { BacklinkArgs, DataRow, FreqComparisonAPI, APIBlockResponse } from '../../../common/api/kontext/freqComparison';
import { FreqComparisonDataBlock, GeneralMultiCritFreqComparisonModelState, stateToAPIArgs } from '../../../common/models/freqComparison';
import { Backlink, BacklinkWithArgs } from '../../../common/tile';
import { puid } from '../../../common/util';
import { ActionName as GlobalActionName, Actions as GlobalActions } from '../../../models/actions';
import { ActionName, Actions, DataLoadedPayload } from './actions';
import { findCurrLemmaVariant } from '../../../models/query';
import { RecognizedQueries, LemmaVariant } from '../../../common/query';



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

    protected waitForTiles:Immutable.Map<number, boolean>;

    private readonly backlink:Backlink|null;

    constructor({dispatcher, tileId, waitForTiles, appServices, api, backlink, initState, lemmas}) {
        super(dispatcher, initState);
        this.tileId = tileId;
        this.waitForTiles = Immutable.Map<number, boolean>(waitForTiles.map(v => [v, false]));
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
                const requests = new Observable((observer:Observer<[number, LemmaVariant]>) => {
                    state.fcrit.keySeq().forEach(critIdx => {
                        this.lemmas.forEach(lemma => {
                            observer.next([critIdx, findCurrLemmaVariant(lemma)]);
                        });
                    });
                    observer.complete();
                }).pipe(
                    mergeMap(([critIdx, lemma]) =>
                        this.api.call(
                            stateToAPIArgs(state, critIdx),
                            lemma
                        ).pipe(
                            map(v => [v, critIdx, lemma] as [APIBlockResponse, number, LemmaVariant])
                        )
                    )
                );

                requests.pipe(scan((acc, value) => acc && value[0].blocks.every(v => v.data.length === 0), true)).subscribe(
                    isEmpty => {
                        dispatch<GlobalActions.TileDataLoaded<{}>>({
                            name: GlobalActionName.TileDataLoaded,
                            payload: {
                                tileId: this.tileId,
                                isEmpty: isEmpty
                            }
                        });
                    }
                );

                requests.subscribe(
                    ([resp, critIdx, lemma]) => {
                        dispatch<Actions.PartialDataLoaded<DataLoadedPayload>>({
                            name: ActionName.PartialDataLoaded,
                            payload: {
                                tileId: this.tileId,
                                block: {data: resp.blocks[0].data.sort((x1, x2) => x2.ipm - x1.ipm).slice(0, state.fmaxitems)},
                                critIdx: critIdx,
                                lemma: lemma
                            }
                        });
                    },
                    error => {
                        dispatch<Actions.PartialDataLoaded<DataLoadedPayload>>({
                            name: ActionName.PartialDataLoaded,
                            payload: {
                                tileId: this.tileId,
                                block: null,
                                critIdx: null,
                                lemma: null
                            },
                            error: error
                        });
                        dispatch<GlobalActions.TileDataLoaded<{}>>({
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
        );
        this.addActionHandler<Actions.PartialDataLoaded<DataLoadedPayload>>(
            ActionName.PartialDataLoaded,
            (state, action) => {
                if (action.payload.tileId === this.tileId) {
                    if (action.error) {
                        state.blocks = Immutable.List<FreqComparisonDataBlock<DataRow>>(state.fcrit.map((_, i) => ({
                            data: Immutable.List<FreqComparisonDataBlock<DataRow>>(),
                            words: Immutable.List<string>(),
                            ident: puid(),
                            label: action.payload.blockLabel ? action.payload.blockLabel : state.critLabels.get(i),
                            isReady: false
                        })));
                        state.error = action.error.message;
                        state.isBusy = false;
    
                    } else {
                        // data for these words were requested (some words can have no data)
                        // also data are rendered in this order of words, we order it so it corresponds to inputs
                        const newWords = state.blocks.get(action.payload.critIdx).words.push(action.payload.lemma.word).sortBy(word =>
                            this.lemmas.findIndex(variants =>
                                variants.some(lemma => lemma.word === word)
                            )
                        ).toList();
                        const newData = action.payload.block.data.length === 0 ?
                            state.blocks.get(action.payload.critIdx).data :
                            state.blocks.get(action.payload.critIdx).data.concat(
                                Immutable.List<DataRow>(action.payload.block.data.map(v => ({
                                    name: this.appServices.translateDbValue(state.corpname, v.name),
                                    freq: v.freq,
                                    ipm: v.ipm,
                                    word: action.payload.lemma.word
                                })))
                            ).toList();
    
                        state.blocks = state.blocks.set(
                            action.payload.critIdx,
                            {
                                data: newData,
                                words: newWords,
                                ident: puid(),
                                label: this.appServices.importExternalMessage(
                                    action.payload.blockLabel ? action.payload.blockLabel : state.critLabels.get(action.payload.critIdx)),
                                isReady: newWords.size === this.lemmas.length
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
    }
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
