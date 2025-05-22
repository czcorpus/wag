/*
 * Copyright 2019 Martin Zimandl <martin.zimandl@gmail.com>
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
import { StatelessModel, IActionQueue, SEDispatcher } from 'kombo';
import { Observable, zip } from 'rxjs';
import { reduce, share, mergeMap } from 'rxjs/operators';
import { Dict, List, pipe } from 'cnc-tskit';

import { IAppServices } from '../../../appServices.js';
import { GeneralSingleCritFreqBarModelState } from '../../../models/tiles/freq.js';
import { Actions as GlobalActions } from '../../../models/actions.js';
import { Actions } from './actions.js';
import { DataApi, SystemMessageType } from '../../../types.js';
import { TooltipValues } from '../../../views/common/index.js';
import { findCurrQueryMatch, QueryMatch, QueryType, RecognizedQueries } from '../../../query/index.js';
import { Backlink } from '../../../page/tile.js';
import { APIResponse, DataRow, MQueryFreqArgs, MQueryFreqDistribAPI } from '../../../api/vendor/mquery/freqs.js';
import { mkLemmaMatchQuery } from '../../../api/vendor/mquery/common.js';

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

export interface GeoAreasModelState extends GeneralSingleCritFreqBarModelState<Array<DataRow>> {
    currQueryMatches:Array<QueryMatch>;
    areaCodeMapping:{[key:string]:string};
    tooltipArea:{tooltipX:number; tooltipY:number, caption:string, data:TooltipValues, multiWordMode:boolean}|null;
    mapSVG:string;
    isAltViewMode:boolean;
    posQueryGenerator:[string, string];
    frequencyDisplayLimit:number;
    backlinks:Array<Backlink>;
}

interface GeoAreasModelArgs {
    dispatcher:IActionQueue;
    tileId:number;
    appServices:IAppServices;
    queryMatches:RecognizedQueries;
    freqApi:MQueryFreqDistribAPI;
    mapLoader:DataApi<string, string>;
    initState:GeoAreasModelState;
    queryType:QueryType;
}

export class GeoAreasModel extends StatelessModel<GeoAreasModelState> {

    private readonly tileId:number;

    private readonly appServices:IAppServices;

    private readonly freqApi:MQueryFreqDistribAPI;

    private readonly mapLoader:DataApi<string, string>;

    private readonly queryMatches:Array<Array<QueryMatch>>;

    private readonly queryType:QueryType;

    constructor({dispatcher, tileId, appServices, queryMatches,
                freqApi, mapLoader, initState, queryType}:GeoAreasModelArgs) {
        super(dispatcher, initState);
        this.tileId = tileId;
        this.appServices = appServices;
        this.queryMatches = queryMatches;
        this.freqApi = freqApi;
        this.mapLoader = mapLoader;
        this.queryType = queryType;

        this.addActionHandler(
            GlobalActions.RequestQueryResponse,
            (state, action) => {
                state.isBusy = true;
                state.backlinks = List.map(_ => null, state.backlinks);
                state.error = null;
            },
            (state, action, dispatch) => {
                const dataStream = new Observable((observer) => {
                    try {
                        pipe(
                            this.queryMatches,
                            List.map((queryMatch, queryIdx) => (
                                [
                                    this.stateToArgs(
                                        state,
                                        findCurrQueryMatch(queryMatch),
                                    ),
                                    queryIdx,
                                ]
                            )),
                            List.forEach(args => observer.next(args)),
                        );
                        observer.complete();
        
                    } catch (e) {
                        observer.error(e);
                    }
        
                }).pipe(
                    mergeMap(([args, queryIdx]) =>
                        zip(
                            this.mapLoader.call(this.appServices.dataStreaming(), this.tileId, queryIdx, 'mapCzech.inline.svg'),
                            this.freqApi.call(
                                this.appServices.dataStreaming(),
                                this.tileId,
                                queryIdx,
                                args,
                            ),
                        )
                    ),
                    share(),
                )
                this.handleLoad(dataStream, state, dispatch);
            }
        );

        this.addActionSubtypeHandler(
            Actions.PartialTileDataLoaded,
            action => action.payload.tileId === this.tileId,
            (state, action) => {
                if (action.error) {
                    state.data = state.currQueryMatches.map(_ => []);
                    state.backlinks = List.map(_ => null, state.backlinks);
                    state.error = this.appServices.normalizeHttpApiError(action.error);

                } else if (action.payload.data.length === 0) {
                    state.data[action.payload.queryId] = [];

                } else {
                    state.data[action.payload.queryId] = action.payload.data;
                    state.backlinks[action.payload.queryId] = this.freqApi.getBacklink(action.payload.queryId, 0);
                }
                state.mapSVG = action.payload.mapSVG;
            }
        );

        this.addActionSubtypeHandler(
            Actions.TileDataLoaded,
            action => action.payload.tileId === this.tileId,
            (state, action) => {
                state.isBusy = false;
            }
        );

        this.addActionSubtypeHandler(
            GlobalActions.EnableAltViewMode,
            action => action.payload.ident === this.tileId,
            (state, action) => {
                state.isAltViewMode = true;
            }
        );

        this.addActionSubtypeHandler(
            GlobalActions.DisableAltViewMode,
            action => action.payload.ident === this.tileId,
            (state, action) => {
                state.isAltViewMode = false;
            }
        );

        this.addActionSubtypeHandler(
            Actions.ShowAreaTooltip,
            action => action.payload.tileId === this.tileId,
            (state, action) => {
                let tooltipData, tooltipCaption;
                if (this.queryType === QueryType.SINGLE_QUERY) {
                    const data = action.payload.areaData[0];
                    tooltipCaption = action.payload.areaName;
                    tooltipData = action.payload.areaData === null || data.freq < state.frequencyDisplayLimit ? {
                            [this.appServices.translate('geolocations__single_tooltip_rel_freq')]: [{value: this.appServices.translate('geolocations__not_enough_data')}],
                            [this.appServices.translate('geolocations__single_tooltip_abs_freq')]: [{value: data ? data.freq : this.appServices.translate('geolocations__not_enough_data')}]
                        } : {
                            [this.appServices.translate('geolocations__single_tooltip_rel_freq')]: [{value: data.ipm}],
                            [this.appServices.translate('geolocations__single_tooltip_abs_freq')]: [{value: data.freq}]
                        }

                } else {
                    tooltipCaption = action.payload.areaName + (action.payload.areaData === null ? '' : ` (${this.appServices.formatNumber(action.payload.areaIpmNorm, 1)} ipm)`);
                    tooltipData = action.payload.areaData === null ?
                        {[appServices.translate('geolocations__not_enough_data')]: [{value: ''}]} :
                        Dict.fromEntries(
                            List.map((lemma, index) => {
                                const areaData = action.payload.areaData.find(item => item.target === index);
                                return [
                                    lemma.word,
                                    areaData ?
                                        [
                                            {value: 100 * areaData.ipm / action.payload.areaIpmNorm, unit: '%'},
                                            {value: areaData.ipm, unit: `ipm, ${appServices.translate('global__frequency')}`},
                                            {value: areaData.freq}
                                        ] :
                                        [
                                            {value: 0, unit: '%'},
                                            {value: 0, unit: `ipm, ${appServices.translate('global__frequency')}`},
                                            {value: 0}
                                        ]
                                ]
                            }, state.currQueryMatches)
                        )
                }

                state.tooltipArea = {
                    tooltipX: action.payload.tooltipX,
                    tooltipY: action.payload.tooltipY,
                    caption: tooltipCaption,
                    data: tooltipData,
                    multiWordMode: this.queryType === QueryType.CMP_QUERY && action.payload.areaData !== null,
                }
            }
        );

        this.addActionSubtypeHandler(
            Actions.HideAreaTooltip,
            action => action.payload.tileId === this.tileId,
            (state, action) => {
                state.tooltipArea = null;
            }
        );

        this.addActionSubtypeHandler(
            GlobalActions.GetSourceInfo,
            action => action.payload.tileId === this.tileId,
            (state, action) => {},
            (state, action, dispatch) => {
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

    private handleLoad(
        dataStream:Observable<[string, APIResponse]>,
        state:GeoAreasModelState,
        dispatch:SEDispatcher
    ):void {
        dataStream.subscribe({
            next: ([mapSVG, resp]) => {
                dispatch<typeof Actions.PartialTileDataLoaded>({
                    name: Actions.PartialTileDataLoaded.name,
                    payload: {
                        tileId: this.tileId,
                        mapSVG,
                        data: resp.data,
                        queryId: resp.queryIdx,
                    }
                });
            },
            error: error => {
                dispatch<typeof Actions.PartialTileDataLoaded>({
                    name: Actions.PartialTileDataLoaded.name,
                    payload: {
                        tileId: this.tileId,
                        mapSVG: null,
                        data: null,
                        queryId: null,
                    },
                    error: error
                });
            }
        });

        dataStream.pipe(
            reduce<[string, APIResponse], {hasData:boolean}>(
                (acc, [_, resp]) => {
                    acc.hasData = acc.hasData || (resp.data && resp.data.length > 0);
                    return acc
                },
                {hasData: false}
            )
        )
        .subscribe(acc =>
            dispatch<typeof Actions.TileDataLoaded>({
                name: Actions.TileDataLoaded.name,
                payload: {
                    tileId: this.tileId,
                    isEmpty: !acc.hasData,
                    corpusName: state.corpname,
                }
            })
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