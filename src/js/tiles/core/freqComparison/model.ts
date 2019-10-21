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
import { concatMap, map } from 'rxjs/operators';

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
    maxChartsPerLine:number;
    colors:Array<string>;
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
        this.actionMatch = {
            [GlobalActionName.RequestQueryResponse]: (state, action:GlobalActions.RequestQueryResponse) => {
                const newState = this.copyState(state);
                newState.isBusy = true;
                newState.error = null;
                return newState;
            },
            [ActionName.SetActiveBlock]: (state, action:Actions.SetActiveBlock) => {
                if (action.payload.tileId === this.tileId) {
                    const newState = this.copyState(state);
                    newState.activeBlock = action.payload.idx;
                    return newState;
                }
                return state;
            },
            [GlobalActionName.TileDataLoaded]: (state, action:GlobalActions.TileDataLoaded<DataLoadedPayload>) => {
                if (action.payload.tileId === this.tileId) {
                    const newState = this.copyState(state);
                    if (action.error) {
                        newState.blocks = Immutable.List<FreqComparisonDataBlock<DataRow>>(state.fcrit.map((_, i) => ({
                            data: Immutable.List<FreqComparisonDataBlock<DataRow>>(),
                            ident: puid(),
                            label: action.payload.blockLabel ? action.payload.blockLabel : state.critLabels.get(i),
                            isReady: true
                        })));
                        newState.error = action.error.message;
                        newState.isBusy = false;

                    } else {                        
                        newState.blocks = newState.blocks.set(
                            action.payload.critIdx,
                            {
                                data: newState.blocks.get(action.payload.critIdx).data.concat(
                                        Immutable.List<DataRow>(action.payload.block.data.map(v => ({
                                            name: this.appServices.translateDbValue(state.corpname, v.name),
                                            freq: v.freq,
                                            ipm: v.ipm,
                                            word: action.payload.lemma.word
                                        })))).toList(),
                                ident: puid(),
                                label: this.appServices.importExternalMessage(
                                    action.payload.blockLabel ? action.payload.blockLabel : state.critLabels.get(action.payload.critIdx)),
                                isReady: true
                            }
                        );
                        newState.isBusy = newState.blocks.some(v => !v.isReady);
                        newState.backlink = null;
                    }
                    return newState;
                }
                return state;
            }
        }
    }

    sideEffects(state:FreqComparisonModelState, action:Action, dispatch:SEDispatcher):void {
        switch (action.name) {
            case GlobalActionName.RequestQueryResponse:
                new Observable((observer:Observer<[number, LemmaVariant]>) => {
                    state.fcrit.keySeq().forEach(critIdx => {
                        this.lemmas.forEach(lemma => {
                            observer.next([critIdx, findCurrLemmaVariant(lemma)]);
                        });
                    });
                }).pipe(
                    concatMap(([critIdx, lemma]) => 
                        this.api.call(stateToAPIArgs(state, critIdx), lemma).pipe(map(v => [v, critIdx, lemma] as [APIBlockResponse, number, LemmaVariant]))
                    )
                )
                .subscribe(
                    ([resp, critIdx, lemma]) => {
                        dispatch<GlobalActions.TileDataLoaded<DataLoadedPayload>>({
                            name: GlobalActionName.TileDataLoaded,
                            payload: {
                                tileId: this.tileId,
                                isEmpty: resp.blocks.every(v => v.data.length === 0),
                                block: resp.blocks.length > 0 ?
                                    {data: resp.blocks[0].data.sort((x1, x2) => x2.ipm - x1.ipm).slice(0, state.fmaxitems)} :
                                    null,
                                critIdx: critIdx,
                                lemma: lemma
                            }
                        });
                    },
                    error => {
                        dispatch<GlobalActions.TileDataLoaded<DataLoadedPayload>>({
                            name: GlobalActionName.TileDataLoaded,
                            payload: {
                                tileId: this.tileId,
                                isEmpty: true,
                                block: null,
                                critIdx: null,
                                lemma: null
                            },
                            error: error
                        });
                    }
                );
            break;
            case GlobalActionName.GetSourceInfo:
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
            break;
        }
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
