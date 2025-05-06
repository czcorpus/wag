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

import { IAppServices } from '../../../appServices.js';
import { GeneralSingleCritFreqBarModelState } from '../../../models/tiles/freq.js';
import { Actions as GlobalActions } from '../../../models/actions.js';
import { Actions } from './actions.js';
import { DataApi, SystemMessageType } from '../../../types.js';
import { TooltipValues } from '../../../views/common/index.js';
import { Backlink } from '../../../page/tile.js';
import { DataRow, MQueryFreqArgs, MQueryFreqDistribAPI } from '../../../api/vendor/mquery/freqs.js';
import { findCurrQueryMatch, QueryMatch, RecognizedQueries } from '../../../query/index.js';
import { mkLemmaMatchQuery } from '../../../api/vendor/mquery/common.js';
import { IDataStreaming } from '../../../page/streaming.js';

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
    backlink:Backlink;
}

export interface GeoAreasModelArgs {
    dispatcher:IActionQueue;
    tileId:number;
    appServices:IAppServices;
    freqApi:MQueryFreqDistribAPI;
    mapLoader:DataApi<string, string>;
    initState:GeoAreasModelState;
    queryMatches:RecognizedQueries;
}


export class GeoAreasModel extends StatelessModel<GeoAreasModelState> {

    private readonly tileId:number;

    private readonly appServices:IAppServices;

    private readonly freqApi:MQueryFreqDistribAPI;

    private readonly mapLoader:DataApi<string, string>;

    private readonly queryMatches:RecognizedQueries;

    constructor({dispatcher, tileId, appServices, freqApi, mapLoader, initState, queryMatches}:GeoAreasModelArgs) {
        super(dispatcher, initState);
        this.tileId = tileId;
        this.appServices = appServices;
        this.freqApi = freqApi;
        this.mapLoader = mapLoader;
        this.queryMatches = queryMatches;


        this.addActionHandler(
            GlobalActions.RequestQueryResponse,
            (state, action) => {
                state.isBusy = true;
                state.error = null;
            },
            (state, action, dispatch) => {
                forkJoin([
                    new Observable((observer:Observer<{}>) => {
                        if (action.error) {
                            observer.error(new Error(this.appServices.translate('global__failed_to_obtain_required_data')));

                        } else {
                            observer.next({});
                            observer.complete();
                        }
                    }).pipe(
                        concatMap(args => this.freqApi.call(
                            this.appServices.dataStreaming(),
                            this.tileId,
                            0,
                            this.stateToArgs(state, findCurrQueryMatch(this.queryMatches[0]))
                        ))
                    ),
                    state.mapSVG ?
                        rxOf(null) :
                        this.mapLoader.call(appServices.dataStreaming(), this.tileId, 0, 'mapCzech.inline.svg')

                ]).subscribe({
                    next: resp => {
                        dispatch<typeof Actions.TileDataLoaded>({
                            name: Actions.TileDataLoaded.name,
                            payload: {
                                tileId: this.tileId,
                                isEmpty: resp[0].data.length === 0,
                                data: resp[0].data,
                                mapSVG: resp[1],
                                concId: resp[0].concId
                            }
                        });
                    },
                    error: error => {
                        dispatch<typeof Actions.TileDataLoaded>({
                            name: Actions.TileDataLoaded.name,
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
                });
            }
        );

        this.addActionHandler(
            Actions.TileDataLoaded,
            (state, action) => {
                if (action.payload.tileId === this.tileId) {
                    state.isBusy = false;
                    if (action.error) {
                        state.data = [];
                        state.backlink = null;
                        state.error = this.appServices.normalizeHttpApiError(action.error);

                    } else if (action.payload.data.length === 0) {
                        state.data = [];
                        state.backlink = null;
                        if (action.payload.mapSVG) {
                            state.mapSVG = action.payload.mapSVG;
                        }

                    } else {
                        state.data = action.payload.data;
                        state.backlink = this.freqApi.getBacklink(0);
                        if (action.payload.mapSVG) {
                            state.mapSVG = action.payload.mapSVG;
                        }
                    }
                }
            }
        );

        this.addActionHandler(
            GlobalActions.EnableAltViewMode,
            (state, action) => {
                if (action.payload.ident === this.tileId) {
                    state.isAltViewMode = true;
                }
            }
        );

        this.addActionHandler(
            GlobalActions.DisableAltViewMode,
            (state, action) => {
                if (action.payload.ident === this.tileId) {
                    state.isAltViewMode = false;
                }
            }
        );

        this.addActionHandler(
            Actions.ShowAreaTooltip,
            (state, action) => {
                if (action.payload.tileId === this.tileId) {
                    const data = action.payload.dataIdx === -1 ? undefined : state.data[action.payload.dataIdx];
                    state.tooltipArea = {
                        tooltipX: action.payload.tooltipX,
                        tooltipY: action.payload.tooltipY,
                        caption: action.payload.areaName,
                        data : data === undefined || data.freq < state.frequencyDisplayLimit ? {
                            [this.appServices.translate('geolocations__tooltip_rel_freq')]: [{value: this.appServices.translate('geolocations__not_enough_data')}],
                            [this.appServices.translate('geolocations__tooltip_abs_freq')]: [{value: data ? data.freq : this.appServices.translate('geolocations__not_enough_data')}]
                        } : {
                            [this.appServices.translate('geolocations__tooltip_rel_freq')]: [{value: data.ipm}],
                            [this.appServices.translate('geolocations__tooltip_abs_freq')]: [{value: data.freq}]
                        }
                    };
                }
            }
        );

        this.addActionHandler(
            Actions.HideAreaTooltip,
            (state, action) => {
                if (action.payload.tileId === this.tileId) {
                    state.tooltipArea = null;
                }
            }
        );

        this.addActionHandler(
            GlobalActions.GetSourceInfo,
            null,
            (state, action, dispatch) => {
                if (action.payload['tileId'] === this.tileId) {
                    this.freqApi.getSourceDescription(
                        this.appServices.dataStreaming().startNewSubgroup(this.tileId),
                        this.tileId,
                        this.appServices.getISO639UILang(),
                        state.corpname

                    ).subscribe({
                        next: data => {
                            dispatch<typeof GlobalActions.GetSourceInfoDone>({
                                name: GlobalActions.GetSourceInfoDone.name,
                                payload: {
                                    data
                                }
                            });
                        },
                        error: error => {
                            console.error(error);
                            dispatch<typeof GlobalActions.GetSourceInfoDone>({
                                name: GlobalActions.GetSourceInfoDone.name,
                                error
                            });
                        }
                    });
                }
            }
        );

        this.addActionSubtypeHandler(
            GlobalActions.FollowBacklink,
            action => action.payload.tileId === this.tileId,
            null,
            (state, action, dispatch) => {
                const args = this.stateToArgs(state, findCurrQueryMatch(this.queryMatches[action.payload.backlink.queryId]));
                this.freqApi.requestBacklink(args).subscribe({
                    next: url => {
                        window.open(url.toString(),'_blank');
                    },
                    error: err => {
                        this.appServices.showMessage(SystemMessageType.ERROR, err);
                    },
                });
            }
        );
    }


    private stateToArgs(state:GeoAreasModelState, queryMatch:QueryMatch, subcname?:string):MQueryFreqArgs {
        return {
            corpname: state.corpname,
            path: state.freqType === 'text-types' ? 'text-types' : 'freqs',
            queryArgs: {
                subcorpus: subcname ? subcname : state.subcname,
                q: mkLemmaMatchQuery(queryMatch, state.posQueryGenerator),
                flimit: state.flimit,
                matchCase: '0',
                attr: state.fcrit,
            }
        };
    }

}