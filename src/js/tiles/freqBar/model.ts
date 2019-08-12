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
import { concatMap } from 'rxjs/operators';

import { AppServices } from '../../appServices';
import { BacklinkArgs, DataRow, MultiBlockFreqDistribAPI } from '../../common/api/kontext/freqs';
import { createBackLink, FreqDataBlock, GeneralMultiCritFreqBarModelState, stateToAPIArgs } from '../../common/models/freq';
import { Backlink, BacklinkWithArgs } from '../../common/tile';
import { puid } from '../../common/util';
import { ActionName as GlobalActionName, Actions as GlobalActions } from '../../models/actions';
import { ConcLoadedPayload } from '../concordance/actions';
import { ActionName, Actions, DataLoadedPayload } from './actions';



export interface FreqBarModelState extends GeneralMultiCritFreqBarModelState<DataRow> {
    maxNumCategories:number;
    activeBlock:number;
    backlink:BacklinkWithArgs<BacklinkArgs>;
}


export class FreqBarModel extends StatelessModel<FreqBarModelState> {

    protected api:MultiBlockFreqDistribAPI;

    protected readonly appServices:AppServices;

    protected readonly tileId:number;

    protected readonly waitForTile:number;

    private readonly backlink:Backlink|null;

    constructor(dispatcher:IActionQueue, tileId:number, waitForTile:number, appServices:AppServices, api:MultiBlockFreqDistribAPI,
                backlink:Backlink|null, initState:FreqBarModelState) {
        super(dispatcher, initState);
        this.tileId = tileId;
        this.waitForTile = waitForTile;
        this.appServices = appServices;
        this.api = api;
        this.backlink = backlink;
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
                    newState.isBusy = false;
                    if (action.error) {
                        newState.blocks = Immutable.List<FreqDataBlock<DataRow>>(state.fcrit.map((_, i) => ({
                            data: Immutable.List<FreqDataBlock<DataRow>>(),
                            ident: puid(),
                            label: action.payload.blockLabels ? action.payload.blockLabels[i] : state.critLabels.get(i)
                        })));
                        newState.error = action.error.message;

                    } else if (action.payload.blocks.length === 0) {
                        newState.blocks = Immutable.List<FreqDataBlock<DataRow>>(state.fcrit.map((_, i) => ({
                            data: Immutable.List<FreqDataBlock<DataRow>>(),
                            ident: puid(),
                            label: state.critLabels.get(i)
                        })));
                        newState.backlink = createBackLink(newState, this.backlink, action.payload.concId);

                    } else {
                        newState.blocks = Immutable.List<FreqDataBlock<DataRow>>(action.payload.blocks.map((block, i) => {
                            return {
                                data: Immutable.List<FreqDataBlock<DataRow>>(block.data.map(v => ({
                                    name: this.appServices.translateDbValue(state.corpname, v.name),
                                    freq: v.freq,
                                    ipm: v.ipm
                                }))),
                                ident: puid(),
                                label: action.payload.blockLabels ? action.payload.blockLabels[i] : state.critLabels.get(i)
                            };
                        }));
                        newState.backlink = createBackLink(newState, this.backlink, action.payload.concId);
                    }
                    return newState;
                }
                return state;
            }
        }
    }

    sideEffects(state:FreqBarModelState, action:Action, dispatch:SEDispatcher):void {
        switch (action.name) {
            case GlobalActionName.RequestQueryResponse:
                this.suspend((action:Action) => {
                    if (action.name === GlobalActionName.TileDataLoaded && action.payload['tileId'] === this.waitForTile) {
                        const payload = (action as GlobalActions.TileDataLoaded<ConcLoadedPayload>).payload;
                        new Observable((observer:Observer<{}>) => {
                            if (action.error) {
                                observer.error(new Error(this.appServices.translate('global__failed_to_obtain_required_data')));

                            } else {
                                observer.next({});
                                observer.complete();
                            }
                        }).pipe(
                            concatMap(args => this.api.call(stateToAPIArgs(state, payload.data.concPersistenceID)))
                        )
                        .subscribe(
                            resp => {
                                dispatch<GlobalActions.TileDataLoaded<DataLoadedPayload>>({
                                    name: GlobalActionName.TileDataLoaded,
                                    payload: {
                                        tileId: this.tileId,
                                        isEmpty: resp.blocks.every(v => v.data.length === 0),
                                        blocks: resp.blocks.map(block => {
                                            return {
                                                data: block.data.sort((x1, x2) => x2.ipm - x1.ipm).slice(0, state.maxNumCategories),
                                            }
                                        }),
                                        concId: resp.concId
                                    }
                                });
                            },
                            error => {
                                dispatch<GlobalActions.TileDataLoaded<DataLoadedPayload>>({
                                    name: GlobalActionName.TileDataLoaded,
                                    payload: {
                                        tileId: this.tileId,
                                        isEmpty: true,
                                        blocks: null,
                                        concId: null
                                    },
                                    error: error
                                });
                            }
                        );
                        return true;
                    }
                    return false;
                });
            break;
        }
    }
}

export const factory = (
    dispatcher:IActionQueue,
    tileId:number,
    waitForTile:number,
    appServices:AppServices,
    api:MultiBlockFreqDistribAPI,
    backlink:Backlink|null,
    initState:FreqBarModelState) => {

    return new FreqBarModel(dispatcher, tileId, waitForTile, appServices, api, backlink, initState);
}
