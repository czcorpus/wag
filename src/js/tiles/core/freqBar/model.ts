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
import { Action, StatelessModel, IActionQueue } from 'kombo';
import { Observable, Observer } from 'rxjs';
import { concatMap } from 'rxjs/operators';
import { Dict, Ident } from 'cnc-tskit';

import { IAppServices } from '../../../appServices';
import { BacklinkArgs, DataRow, MultiBlockFreqDistribAPI } from '../../../common/api/kontext/freqs';
import { createBackLink, GeneralMultiCritFreqBarModelState, stateToAPIArgs } from '../../../common/models/freq';
import { Backlink, BacklinkWithArgs } from '../../../common/tile';
import { ActionName as GlobalActionName, Actions as GlobalActions } from '../../../models/actions';
import { ConcLoadedPayload } from '../concordance/actions';
import { ActionName, Actions, DataLoadedPayload } from './actions';
import { callWithExtraVal } from '../../../common/api/util';


export interface FreqBarModelState extends GeneralMultiCritFreqBarModelState<DataRow> {
    maxNumCategories:number;
    activeBlock:number;
    backlink:BacklinkWithArgs<BacklinkArgs>;
    subqSyncPalette:boolean;
    isAltViewMode:boolean;
}

export interface FreqBarModelArgs {
    dispatcher:IActionQueue;
    tileId:number;
    waitForTiles:Array<number>;
    subqSourceTiles:Array<number>;
    appServices:IAppServices;
    api:MultiBlockFreqDistribAPI;
    backlink:Backlink|null;
    initState:FreqBarModelState;
}


export class FreqBarModel extends StatelessModel<FreqBarModelState, {[tileId:string]:boolean}> {

    protected api:MultiBlockFreqDistribAPI;

    protected readonly appServices:IAppServices;

    protected readonly tileId:number;

    protected waitForTiles:{[tileId:string]:boolean};

    protected subqSourceTiles:{[tileId:string]:boolean};

    private readonly backlink:Backlink|null;

    constructor({dispatcher, tileId, waitForTiles, subqSourceTiles, appServices, api, backlink, initState}:FreqBarModelArgs) {
        super(dispatcher, initState);
        this.tileId = tileId;
        this.waitForTiles = Dict.fromEntries(waitForTiles.map(v => [v.toFixed(), false]));
        this.subqSourceTiles = Dict.fromEntries(subqSourceTiles.map(v => [v.toFixed(), true]));
        this.appServices = appServices;
        this.api = api;
        this.backlink = backlink;

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
        this.addActionHandler<GlobalActions.RequestQueryResponse>(
            GlobalActionName.RequestQueryResponse,
            (state, action) => {
                state.isBusy = true;
                state.error = null;
            },
            (state, action, dispatch) => {
                this.suspend(Dict.map(_ => true, this.waitForTiles), (action:Action, syncData) => {
                    if (action.name === GlobalActionName.TileDataLoaded && this.waitForTiles[action.payload['tileId']] !== undefined) {
                        const payload = (action as GlobalActions.TileDataLoaded<ConcLoadedPayload>).payload;
                        new Observable((observer:Observer<number>) => {
                            if (action.error) {
                                observer.error(new Error(this.appServices.translate('global__failed_to_obtain_required_data')));

                            } else {
                                state.fcrit.forEach((_, critIdx) => observer.next(critIdx));
                                observer.complete();
                            }
                        }).pipe(
                            concatMap(critIdx => callWithExtraVal(
                                    this.api,
                                    stateToAPIArgs(state, payload.concPersistenceIDs[0], critIdx),
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

                        const ans = {...syncData};
                        ans[payload.tileId.toFixed()] = false;
                        return Dict.hasValue(true, ans) ? ans : null;
                    }
                    return syncData;
                });
            }
        );
        this.addActionHandler<Actions.SetActiveBlock>(
            ActionName.SetActiveBlock,
            (state, action) => {
                state.activeBlock = action.payload.idx;
            }
        );
        this.addActionHandler<GlobalActions.TileDataLoaded<DataLoadedPayload>>(
            GlobalActionName.TileDataLoaded,
            (state, action) => {
                if (action.payload.tileId === this.tileId) {
                    if (action.error) {
                        state.blocks = state.fcrit.map((_, i) => ({
                            data: [],
                            ident: Ident.puid(),
                            label: this.appServices.importExternalMessage(action.payload.blockLabel ? action.payload.blockLabel : state.critLabels[i]),
                            isReady: true
                        }));
                        state.error = action.error.message;
                        state.isBusy = false;

                    } else {
                        state.blocks[action.payload.critIdx] = {
                            data: action.payload.block ?
                                action.payload.block.data.map(v => ({
                                    name: this.appServices.translateDbValue(state.corpname, v.name),
                                    freq: v.freq,
                                    ipm: v.ipm,
                                    norm: v.norm
                                })) : null,
                            ident: Ident.puid(),
                            label: this.appServices.importExternalMessage(
                                action.payload.blockLabel ?
                                    action.payload.blockLabel :
                                    state.critLabels[action.payload.critIdx]
                            ),
                            isReady: true
                        };
                        state.isBusy = state.blocks.some(v => !v.isReady);
                        state.backlink = createBackLink(state, this.backlink, action.payload.concId);
                    }
                }
            }
        );
        this.addActionHandler<GlobalActions.GetSourceInfo>(
            GlobalActionName.GetSourceInfo,
            (state, action) => {},
            (state, action, dispatch) => {
                if (action.payload.tileId === this.tileId) {
                    this.api.getSourceDescription(this.tileId, this.appServices.getISO639UILang(), state.corpname)
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
                                paylod: {
                                    tileId: this.tileId
                                }
                            });
                        }
                    );
                }
            }
        );
    };
}

export const factory = (
    dispatcher:IActionQueue,
    tileId:number,
    waitForTiles:Array<number>,
    subqSourceTiles:Array<number>,
    appServices:IAppServices,
    api:MultiBlockFreqDistribAPI,
    backlink:Backlink|null,
    initState:FreqBarModelState) => {

    return new FreqBarModel({
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
