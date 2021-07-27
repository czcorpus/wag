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
import { BacklinkArgs } from '../../../api/vendor/kontext/freqs';
import { GeneralMultiCritFreqBarModelState } from '../../../models/tiles/freq';
import { Backlink, BacklinkWithArgs } from '../../../page/tile';
import { Actions as GlobalActions } from '../../../models/actions';
import { Actions as ConcActions } from '../concordance/actions';
import { Actions } from './actions';
import { callWithExtraVal } from '../../../api/util';
import { DataRow, IMultiBlockFreqDistribAPI } from '../../../api/abstract/freqs';
import { isWebDelegateApi } from '../../../types';


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
    waitForTilesTimeoutSecs:number;
    subqSourceTiles:Array<number>;
    appServices:IAppServices;
    api:IMultiBlockFreqDistribAPI<{}>;
    backlink:Backlink|null;
    initState:FreqBarModelState;
}


export class FreqBarModel extends StatelessModel<FreqBarModelState, {[tileId:string]:boolean}> {

    protected api:IMultiBlockFreqDistribAPI<{}>;

    protected readonly appServices:IAppServices;

    protected readonly tileId:number;

    protected waitForTiles:{[tileId:string]:boolean};

    protected waitForTilesTimeoutSecs:number;

    protected subqSourceTiles:{[tileId:string]:boolean};

    private readonly backlink:Backlink|null;

    constructor({dispatcher, tileId, waitForTiles, waitForTilesTimeoutSecs, subqSourceTiles, appServices,
            api, backlink, initState}:FreqBarModelArgs) {
        super(dispatcher, initState);
        this.tileId = tileId;
        this.waitForTiles = Dict.fromEntries(waitForTiles.map(v => [v.toFixed(), false]));
        this.waitForTilesTimeoutSecs = waitForTilesTimeoutSecs;
        this.subqSourceTiles = Dict.fromEntries(subqSourceTiles.map(v => [v.toFixed(), true]));
        this.appServices = appServices;
        this.api = api;
        this.backlink = isWebDelegateApi(this.api) ? this.api.getBackLink() : backlink;

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
        this.addActionHandler<typeof GlobalActions.RequestQueryResponse>(
            GlobalActions.RequestQueryResponse.name,
            (state, action) => {
                state.isBusy = true;
                state.error = null;
            },
            (state, action, dispatch) => {
                this.suspendWithTimeout(
                    this.waitForTilesTimeoutSecs * 1000,
                    Dict.map(_ => true, this.waitForTiles),
                    (action:Action, syncData) => {
                        if (ConcActions.isTileDataLoaded(action) && this.waitForTiles[action.payload.tileId] !== undefined) {
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
                                        this.api.stateToArgs(state, action.payload.concPersistenceIDs[0], critIdx),
                                        critIdx
                                ))
                            )
                            .subscribe(
                                ([resp, critIdx]) => {
                                    dispatch<typeof Actions.TileDataLoaded>({
                                        name: Actions.TileDataLoaded.name,
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
                                    dispatch<typeof Actions.TileDataLoaded>({
                                        name: GlobalActions.TileDataLoaded.name,
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
                            ans[action.payload.tileId.toFixed()] = false;
                            return Dict.hasValue(true, ans) ? ans : null;
                        }
                        return syncData;
                    }
                );
            }
        );

        this.addActionHandler<typeof Actions.SetActiveBlock>(
            Actions.SetActiveBlock.name,
            (state, action) => {
                state.activeBlock = action.payload.idx;
            }
        );

        this.addActionHandler<typeof Actions.TileDataLoaded>(
            Actions.TileDataLoaded.name,
            (state, action) => {
                if (action.payload.tileId === this.tileId) {
                    if (action.error) {
                        state.blocks = state.fcrit.map((_, i) => ({
                            data: [],
                            ident: Ident.puid(),
                            label: this.appServices.importExternalMessage(action.payload.blockLabel ? action.payload.blockLabel : state.critLabels[i]),
                            isReady: true
                        }));
                        state.error = this.appServices.normalizeHttpApiError(action.error);
                        state.isBusy = false;

                    } else {
                        state.blocks[action.payload.critIdx] = {
                            data: action.payload.block ?
                                action.payload.block.data.map(v => ({
                                    name: this.appServices.translateResourceMetadata(state.corpname, v.name),
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
                        state.backlink = this.api.createBacklink(state, this.backlink, action.payload.concId);
                    }
                }
            }
        );
        this.addActionHandler<typeof GlobalActions.GetSourceInfo>(
            GlobalActions.GetSourceInfo.name,
            (state, action) => {},
            (state, action, dispatch) => {
                if (action.payload.tileId === this.tileId) {
                    this.api.getSourceDescription(this.tileId, this.appServices.getISO639UILang(), state.corpname)
                    .subscribe(
                        (data) => {
                            dispatch({
                                name: GlobalActions.GetSourceInfoDone.name,
                                payload: {
                                    tileId: this.tileId,
                                    data: data
                                }
                            });
                        },
                        (err) => {
                            console.error(err);
                            dispatch({
                                name: GlobalActions.GetSourceInfoDone.name,
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
    waitForTilesTimeoutSecs:number,
    subqSourceTiles:Array<number>,
    appServices:IAppServices,
    api:IMultiBlockFreqDistribAPI<{}>,
    backlink:Backlink|null,
    initState:FreqBarModelState) => {

    return new FreqBarModel({
        dispatcher,
        tileId,
        waitForTiles,
        waitForTilesTimeoutSecs,
        subqSourceTiles,
        appServices,
        api,
        backlink,
        initState
    });
}
