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
import { map, mergeMap, scan, tap, reduce } from 'rxjs/operators';

import { AppServices } from '../../../appServices';
import { BacklinkArgs, FreqComparisonAPI, APIBlockResponse, CritVariantsResponse } from '../../../common/api/kontext/freqTree';
import { GeneralCritFreqTreeModelState, stateToAPIArgs, FreqTreeDataBlock } from '../../../common/models/freqTree';
import { Backlink, BacklinkWithArgs } from '../../../common/tile';
import { puid } from '../../../common/util';
import { ActionName as GlobalActionName, Actions as GlobalActions } from '../../../models/actions';
import { ActionName, Actions, DataLoadedPayload } from './actions';
import { findCurrLemmaVariant } from '../../../models/query';
import { RecognizedQueries, LemmaVariant } from '../../../common/query';
import { FreqDataBlock } from '../../../common/models/freq';



export interface FreqComparisonModelState extends GeneralCritFreqTreeModelState {
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
            },
            [ActionName.PartialDataLoaded]: (state, action:GlobalActions.TileDataLoaded<DataLoadedPayload>) => {
                if (action.payload.tileId === this.tileId) {
                    const newState = this.copyState(state);
                    if (action.error) {
                        newState.frequencyTree = Immutable.List([{
                            data: Immutable.Map(),
                            ident: puid(),
                            label: '',
                            isReady: false
                        } as FreqTreeDataBlock]);
                        newState.error = action.error.message;
                        newState.isBusy = false;
                    } else {
                        const freqTree = newState.frequencyTree.get(0);
                        freqTree.isReady = !freqTree.isReady; //TODO
                        freqTree.data = action.payload.data;
                        newState.frequencyTree = newState.frequencyTree.set(0, freqTree);                        
                        newState.isBusy = false;
                        newState.backlink = null;
                    }
                    return newState;
                }
            }
        }
    }

    sideEffects(state:FreqComparisonModelState, action:Action, dispatch:SEDispatcher):void {
        switch (action.name) {
            case GlobalActionName.RequestQueryResponse:
                const requests = new Observable((observer:Observer<LemmaVariant>) => {
                    this.lemmas.forEach(lemma => {
                        observer.next(findCurrLemmaVariant(lemma));
                    });
                    observer.complete();
                }).pipe(
                    mergeMap<LemmaVariant, Observable<CritVariantsResponse>>(lemma => 
                        this.api.callVariants(
                            stateToAPIArgs(state, 0),
                            lemma
                        )
                    ),
                    mergeMap(resp =>
                        of(...resp.fcritValues).pipe(
                            mergeMap(fcritValue =>
                                this.api.call(
                                    stateToAPIArgs(state, 1),
                                    resp.concId,
                                    {[resp.fcrit]: fcritValue}
                                )
                            ),
                            map(v => [v, resp.lemma] as [APIBlockResponse, LemmaVariant])
                        )
                    ),
                    reduce<[APIBlockResponse, LemmaVariant], Immutable.Map<string, any>>((acc, [v, lemma]) => acc.mergeDeep({
                        [lemma.word]:{
                            [v.filter[state.fcritTree.get(0)]]:v.data
                        }
                    }), Immutable.Map())
                );

                requests.pipe(scan((acc, value) => acc && value.size === 0, true)).subscribe(
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
                    data => {
                        dispatch<Actions.PartialDataLoaded<DataLoadedPayload>>({
                            name: ActionName.PartialDataLoaded,
                            payload: {
                                tileId: this.tileId,
                                data: data,
                            }
                        });
                    },
                    error => {
                        dispatch<Actions.PartialDataLoaded<DataLoadedPayload>>({
                            name: ActionName.PartialDataLoaded,
                            payload: {
                                tileId: this.tileId,
                                data: null,
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
