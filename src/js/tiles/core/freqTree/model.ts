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
import { Observable, Observer, of } from 'rxjs';
import { map, mergeMap, reduce } from 'rxjs/operators';

import { AppServices } from '../../../appServices';
import { BacklinkArgs, FreqTreeAPI, APILeafResponse, APIVariantsResponse } from '../../../common/api/kontext/freqTree';
import { GeneralCritFreqTreeModelState, stateToAPIArgs, FreqTreeDataBlock } from '../../../common/models/freqTree';
import { Backlink, BacklinkWithArgs } from '../../../common/tile';
import { puid } from '../../../common/util';
import { ActionName as GlobalActionName, Actions as GlobalActions } from '../../../models/actions';
import { ActionName, Actions, DataLoadedPayload } from './actions';
import { findCurrLemmaVariant } from '../../../models/query';
import { RecognizedQueries, LemmaVariant } from '../../../common/query';



export interface FreqTreeModelState extends GeneralCritFreqTreeModelState {
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
    api:FreqTreeAPI;
    backlink:Backlink|null;
    initState:FreqTreeModelState;
}


export class FreqTreeModel extends StatelessModel<FreqTreeModelState> {
    private readonly lemmas:RecognizedQueries;

    protected api:FreqTreeAPI;

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
                if (action.payload['tileId'] === this.tileId) {
                    const newState = this.copyState(state);
                    newState.activeBlock = action.payload.idx;
                    return newState;
                }
                return state
            },
            [GlobalActionName.TileDataLoaded]: (state, action:GlobalActions.TileDataLoaded<DataLoadedPayload>) => {
                if (action.payload['tileId'] !== this.tileId) {
                    return state
                }
                
                const newState = this.copyState(state);
                if (action.error) {
                    newState.frequencyTree = Immutable.List(newState.fcritTrees.map((_, index) => ({
                        data: Immutable.Map(),
                        ident: puid(),
                        label: state.treeLabels ? state.treeLabels.get(index) : '',
                        isReady: true
                    }) as FreqTreeDataBlock))
                    newState.error = action.error.message;
                    newState.isBusy = false;
                } else {
                    newState.frequencyTree = action.payload.data.valueSeq().map((value, index) => ({
                        data: Immutable.fromJS(value),
                        ident: puid(),
                        label: state.treeLabels ? state.treeLabels.get(index) : '',
                        isReady: true,
                    }) as FreqTreeDataBlock).toList();
                    newState.isBusy = false;
                    newState.backlink = null;
                }
                return newState;
            }
        }
    }

    sideEffects(state:FreqTreeModelState, action:Action, dispatch:SEDispatcher):void {
        switch (action.name) {
            case GlobalActionName.RequestQueryResponse:
                new Observable((observer:Observer<[number, LemmaVariant]>) => {
                    state.fcritTrees.forEach((_, index) =>
                        this.lemmas.forEach(lemma => {
                            observer.next([index, findCurrLemmaVariant(lemma)]);
                        })
                    )
                    observer.complete();
                }).pipe(
                    mergeMap<[number, LemmaVariant], Observable<[number, LemmaVariant, APIVariantsResponse]>>(([blockId, lemma]) => 
                        this.api.callVariants(
                            stateToAPIArgs(state, blockId, 0),
                            lemma
                        ).pipe(
                            map(resp => [blockId, lemma, resp])
                        )
                    ),
                    mergeMap(([blockId, lemma, resp1]) =>
                        of(...resp1.fcritValues).pipe(
                            mergeMap(fcritValue =>
                                this.api.call(
                                    stateToAPIArgs(state, blockId, 1),
                                    resp1.concId,
                                    {[resp1.fcrit]: fcritValue}
                                )
                            ),
                            map(resp2 => [blockId, lemma, resp2] as [number, LemmaVariant, APILeafResponse])
                        )
                    ),
                    reduce<[number, LemmaVariant, APILeafResponse], Immutable.Map<string, any>>((acc, [blockId, lemma, resp]) => acc.mergeDeep({
                        [blockId]:{
                            [lemma.word]:{
                                [resp.filter[state.fcritTrees.get(blockId).get(0)]]:resp.data
                            }
                        }
                    }), Immutable.Map())
                ).subscribe(
                    data => {
                        dispatch<GlobalActions.TileDataLoaded<DataLoadedPayload>>({
                            name: GlobalActionName.TileDataLoaded,
                            payload: {
                                tileId: this.tileId,
                                isEmpty: data.size === 0,
                                data: data
                            }
                        });
                    },
                    error => {
                        dispatch<GlobalActions.TileDataLoaded<DataLoadedPayload>>({
                            name: GlobalActionName.TileDataLoaded,
                            payload: {
                                tileId: this.tileId,
                                isEmpty: true,
                                data: null
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
    api:FreqTreeAPI,
    backlink:Backlink|null,
    initState:FreqTreeModelState,
    lemmas:RecognizedQueries) => {

    return new FreqTreeModel({
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
