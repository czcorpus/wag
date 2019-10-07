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

import { AppServices } from '../../../appServices';
import { BacklinkArgs, DataRow, MultiBlockFreqDistribAPI } from '../../../common/api/kontext/freqs';
import { createBackLink, FreqDataBlock, GeneralMultiCritFreqBarModelState, stateToAPIArgs } from '../../../common/models/freq';
import { Backlink, BacklinkWithArgs } from '../../../common/tile';
import { puid } from '../../../common/util';
import { ActionName as GlobalActionName, Actions as GlobalActions } from '../../../models/actions';
import { ConcLoadedPayload } from '../concordance/actions';
import { ActionName, Actions, DataLoadedPayload } from './actions';
import { callWithExtraVal } from '../../../common/api/util';



export interface DocModelState extends GeneralMultiCritFreqBarModelState<DataRow> {
    maxNumCategories:number;
    maxNumCategoriesPerPage:number;
    activeBlock:number;
    backlink:BacklinkWithArgs<BacklinkArgs>;
    subqSyncPalette:boolean;
    blockPage:Immutable.Map<string, number>;
}

export interface DocModelArgs {
    dispatcher:IActionQueue;
    tileId:number;
    waitForTiles:Array<number>;
    subqSourceTiles:Array<number>;
    appServices:AppServices;
    api:MultiBlockFreqDistribAPI;
    backlink:Backlink|null;
    initState:DocModelState;
}


export class DocModel extends StatelessModel<DocModelState> {

    protected api:MultiBlockFreqDistribAPI;

    protected readonly appServices:AppServices;

    protected readonly tileId:number;

    protected waitForTiles:Immutable.Map<number, boolean>;

    protected subqSourceTiles:Immutable.Set<number>;

    private readonly backlink:Backlink|null;

    constructor({dispatcher, tileId, waitForTiles, subqSourceTiles, appServices, api, backlink, initState}) {
        super(dispatcher, initState);
        this.tileId = tileId;
        this.waitForTiles = Immutable.Map<number, boolean>(waitForTiles.map(v => [v, false]));
        this.subqSourceTiles = Immutable.Set<number>(subqSourceTiles);
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
            [ActionName.NextPage]: (state, action:Actions.NextPage) => {
                if (action.payload.tileId === this.tileId) {
                    const newState = this.copyState(state);
                    const page = newState.blockPage.get(action.payload.blockId);
                    
                    page * newState.maxNumCategoriesPerPage >= newState.blocks.find(v => v.ident === action.payload.blockId).data.size ?
                        null :
                        newState.blockPage = newState.blockPage.set(action.payload.blockId, page+1);
                    
                    return newState;
                }
                return state;
            },
            [ActionName.PreviousPage]: (state, action:Actions.PreviousPage) => {
                if (action.payload.tileId === this.tileId) {
                    const newState = this.copyState(state);
                    const page = newState.blockPage.get(action.payload.blockId);

                    page === 1 ? null : newState.blockPage = newState.blockPage.set(action.payload.blockId, page-1);

                    return newState;
                }
                return state;
            },
            [GlobalActionName.TileDataLoaded]: (state, action:GlobalActions.TileDataLoaded<DataLoadedPayload>) => {
                if (action.payload.tileId === this.tileId) {
                    const newState = this.copyState(state);
                    if (action.error) {
                        newState.blocks = Immutable.List<FreqDataBlock<DataRow>>(state.fcrit.map((_, i) => ({
                            data: Immutable.List<FreqDataBlock<DataRow>>(),
                            ident: puid(),
                            label: action.payload.blockLabel ? action.payload.blockLabel : state.critLabels.get(i),
                            isReady: true
                        })));
                        newState.error = action.error.message;
                        newState.isBusy = false;

                    } else {
                        const blockId = puid();
                        newState.blocks = newState.blocks.set(
                            action.payload.critIdx,
                            {
                                data: action.payload.block ?
                                    Immutable.List<DataRow>(action.payload.block.data.map(v => ({
                                        name: this.appServices.translateDbValue(state.corpname, v.name),
                                        freq: v.freq,
                                        ipm: v.ipm
                                    }))) : null,
                                ident: blockId,
                                label: this.appServices.importExternalMessage(
                                    action.payload.blockLabel ? action.payload.blockLabel : state.critLabels.get(action.payload.critIdx)),
                                isReady: true
                            }
                        );
                        newState.blockPage = newState.blockPage.set(blockId, 1);
                        newState.isBusy = newState.blocks.some(v => !v.isReady);
                        newState.backlink = createBackLink(newState, this.backlink, action.payload.concId);
                    }
                    return newState;
                }
                return state;
            }
        }
    }

    sideEffects(state:DocModelState, action:Action, dispatch:SEDispatcher):void {
        switch (action.name) {
            case GlobalActionName.RequestQueryResponse:
                this.waitForTiles = this.waitForTiles.map(_ => true).toMap();
                this.suspend((action:Action) => {
                    if (action.name === GlobalActionName.TileDataLoaded && this.waitForTiles.has(action.payload['tileId'])) {
                        const payload = (action as GlobalActions.TileDataLoaded<ConcLoadedPayload>).payload;
                        this.waitForTiles = this.waitForTiles.set(payload.tileId, false);
                        new Observable((observer:Observer<number>) => {
                            if (action.error) {
                                observer.error(new Error(this.appServices.translate('global__failed_to_obtain_required_data')));

                            } else {
                                state.fcrit.keySeq().forEach(critIdx => observer.next(critIdx));
                                observer.complete();
                            }
                        }).pipe(
                            concatMap(critIdx => callWithExtraVal(
                                    this.api,
                                    stateToAPIArgs(state, payload.data.concPersistenceID, critIdx),
                                    critIdx
                            ))
                        )
                        .subscribe(
                            ([resp, critIdx]) => {
                                dispatch<GlobalActions.TileDataLoaded<DataLoadedPayload>>({
                                    name: GlobalActionName.TileDataLoaded,
                                    payload: {
                                        tileId: this.tileId,
                                        isEmpty: resp.blocks.every(v => v.data.length === 0),
                                        block: resp.blocks.length > 0 ?
                                            {data: resp.blocks[0].data.sort((x1, x2) => x2.ipm - x1.ipm).slice(0, state.maxNumCategories)} :
                                            null,
                                        concId: resp.concId,
                                        critIdx: critIdx
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
                                        concId: null,
                                        critIdx: null
                                    },
                                    error: error
                                });
                            }
                        );
                        return !this.waitForTiles.contains(true);
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
    waitForTiles:Array<number>,
    subqSourceTiles:Array<number>,
    appServices:AppServices,
    api:MultiBlockFreqDistribAPI,
    backlink:Backlink|null,
    initState:DocModelState) => {

    return new DocModel({
        dispatcher,
        tileId,
        waitForTiles,
        subqSourceTiles,
        appServices,
        api,
        backlink,
        initState
    });
}
