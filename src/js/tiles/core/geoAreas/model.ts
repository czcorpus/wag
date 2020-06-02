/*
 * Copyright 2019 Tomas Machalek <tomas.machalek@gmail.com>
 * Copyright 2019 Institute of the Czech National Corpus,
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
import { StatelessModel, IActionQueue } from 'kombo';
import { forkJoin, Observable, Observer, of as rxOf } from 'rxjs';
import { concatMap } from 'rxjs/operators';

import { IAppServices } from '../../../appServices';
import { GeneralSingleCritFreqBarModelState } from '../../../common/models/freq';
import { ActionName as GlobalActionName, Actions as GlobalActions } from '../../../models/actions';
import { ConcLoadedPayload } from '../concordance/actions';
import { ActionName, Actions, DataLoadedPayload } from './actions';
import { DataApi } from '../../../common/types';
import { TooltipValues } from '../../../views/global';
import { IFreqDistribAPI, DataRow } from '../../../common/api/abstract/freqs';

/*
oral2013:
"pohraničí české": "naCPO",
"středočeská": "naSTR",
"jihozápadočeská": "naJZC",
"severovýchodočeská": "naSVC",
"česko-moravská": "naCMO",
"středomoravská": "naSTM",
"pohraničí moravské": "naMPO",
"slezská": "naSLE",
"východomoravská": "naVYM"

??:
"české pohraničí": "naCPO",
"středočeská": "naSTR",
"jihozápadočeská": "naJZC",
"severovýchodočeská": "naSVC",
"českomoravská": "naCMO",
"středomoravská": "naSTM",
"pohraničí moravské a slezské": "naMPO",
"slezská": "naSLE",
"východomoravská": "naVYM"

ORAL_V1:
"středočeská": "naSTR",
"severovýchodočeská": "naSVC",
"středomoravská": "naSTM",
"pohraničí české": "naCPO",
"východomoravská": "naVYM",
"západočeská": "naZAC",
"jihočeská": "naJIC",
"slezská": "naSLE",
"česko-moravská": "naCMO",
"pohraničí moravské": "naMPO",
"zahraničí": "naFRG",
"neznámé": "naUNK"
*/

export interface GeoAreasModelState extends GeneralSingleCritFreqBarModelState<DataRow> {
    areaCodeMapping:{[key:string]:string};
    tooltipArea:{tooltipX:number; tooltipY:number, data:TooltipValues, caption:string}|null;
    mapSVG:string;
    isAltViewMode:boolean;
    frequencyDisplayLimit:number;
}

export interface GeoAreasModelArgs {
    dispatcher:IActionQueue;
    tileId:number;
    waitForTile:number;
    waitForTilesTimeoutSecs:number;
    appServices:IAppServices;
    api:IFreqDistribAPI<{}>;
    mapLoader:DataApi<string, string>;
    initState:GeoAreasModelState;
}


export class GeoAreasModel extends StatelessModel<GeoAreasModelState> {

    private readonly tileId:number;

    private readonly waitForTile:number;

    private readonly waitForTilesTimeoutSecs:number;

    private readonly appServices:IAppServices;

    private readonly api:IFreqDistribAPI<{}>;

    private readonly mapLoader:DataApi<string, string>;

    constructor({dispatcher, tileId, waitForTile, waitForTilesTimeoutSecs, appServices,
            api, mapLoader, initState}:GeoAreasModelArgs) {
        super(dispatcher, initState);
        this.tileId = tileId;
        this.waitForTile = waitForTile;
        this.waitForTilesTimeoutSecs = waitForTilesTimeoutSecs;
        this.appServices = appServices;
        this.api = api;
        this.mapLoader = mapLoader;

        this.addActionHandler<GlobalActions.RequestQueryResponse>(
            GlobalActionName.RequestQueryResponse,
            (state, action) => {
                state.isBusy = true;
                state.error = null;
            },
            (state, action, dispatch) => {
                if (this.waitForTile > -1) {
                    this.suspendWithTimeout(
                        this.waitForTilesTimeoutSecs * 1000,
                        {},
                        (action, syncStatus) => {
                            if (action.name === GlobalActionName.TileDataLoaded && action.payload['tileId'] === this.waitForTile) {
                                const payload = (action as GlobalActions.TileDataLoaded<ConcLoadedPayload>).payload;

                                forkJoin(
                                    new Observable((observer:Observer<{}>) => {
                                        if (action.error) {
                                            observer.error(new Error(this.appServices.translate('global__failed_to_obtain_required_data')));

                                        } else {
                                            observer.next({});
                                            observer.complete();
                                        }
                                    }).pipe(
                                        concatMap(args => this.api.call(
                                            this.api.stateToArgs(state, payload.concPersistenceIDs[0])
                                        ))
                                    ),
                                    state.mapSVG ? rxOf(null) : this.mapLoader.call('mapCzech.inline.svg')
                                )
                                .subscribe(
                                    resp => {
                                        dispatch<GlobalActions.TileDataLoaded<DataLoadedPayload>>({
                                            name: GlobalActionName.TileDataLoaded,
                                            payload: {
                                                tileId: this.tileId,
                                                isEmpty: resp[0].data.length === 0,
                                                data: resp[0].data,
                                                mapSVG: resp[1],
                                                concId: resp[0].concId
                                            }
                                        });
                                    },
                                    error => {
                                        dispatch<GlobalActions.TileDataLoaded<DataLoadedPayload>>({
                                            name: GlobalActionName.TileDataLoaded,
                                            payload: {
                                                tileId: this.tileId,
                                                isEmpty: true,
                                                data: null,
                                                mapSVG: null,
                                                concId: null
                                            },
                                            error: error
                                        });
                                    }
                                );
                                return null;
                            }
                            return syncStatus;
                        }
                    );

                } else {
                    dispatch<GlobalActions.TileDataLoaded<DataLoadedPayload>>({
                        name: GlobalActionName.TileDataLoaded,
                        payload: {
                            tileId: this.tileId,
                            isEmpty: true,
                            data: null,
                            mapSVG: null,
                            concId: null
                        },
                        error: new Error('GeoAreasModel cannot load its own concordance')
                    });
                }
            }
        );

        this.addActionHandler<GlobalActions.TileDataLoaded<DataLoadedPayload>>(
            GlobalActionName.TileDataLoaded,
            (state, action) => {
                if (action.payload.tileId === this.tileId) {
                    state.isBusy = false;
                    if (action.error) {
                        state.data = [];
                        state.error = action.error.message;

                    } else if (action.payload.data.length === 0) {
                        state.data = [];
                        if (action.payload.mapSVG) {
                            state.mapSVG = action.payload.mapSVG;
                        }

                    } else {
                        state.data = action.payload.data;
                        if (action.payload.mapSVG) {
                            state.mapSVG = action.payload.mapSVG;
                        }
                    }
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

        this.addActionHandler<Actions.ShowAreaTooltip>(
            ActionName.ShowAreaTooltip,
            (state, action) => {
                if (action.payload.tileId === this.tileId) {
                    const data = state.data[action.payload.areaIdx];
                    state.tooltipArea = {
                        tooltipX: action.payload.tooltipX,
                        tooltipY: action.payload.tooltipY,
                        caption: data.name,
                        data : data.freq < state.frequencyDisplayLimit ? {
                            [this.appServices.translate('geolocations__table_heading_ipm')]: [[this.appServices.translate('geolocations__not_enough_data'), '']],
                            [this.appServices.translate('geolocations__table_heading_abs')]: [[data.freq, '']]
                        } : {
                            [this.appServices.translate('geolocations__table_heading_ipm')]: [[data.ipm, '']],
                            [this.appServices.translate('geolocations__table_heading_abs')]: [[data.freq, '']]
                        }
                    };
                }
            }
        );

        this.addActionHandler<Actions.HideAreaTooltip>(
            ActionName.HideAreaTooltip,
            (state, action) => {
                if (action.payload.tileId === this.tileId) {
                    state.tooltipArea = null;
                }
            }
        );

        this.addActionHandler<GlobalActions.GetSourceInfo>(
            GlobalActionName.GetSourceInfo,
            null,
            (state, action, dispatch) => {
                if (action.payload['tileId'] === this.tileId) {
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
                                payload: {
                                    tileId: this.tileId
                                }

                            });
                        }
                    );
                }
            }
        );
    }

}