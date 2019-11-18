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
import * as Immutable from 'immutable';
import { Action, StatelessModel, IActionQueue, SEDispatcher } from 'kombo';
import { Observable, of as rxOf, combineLatest } from 'rxjs';
import { concatMap, reduce } from 'rxjs/operators';

import { AppServices } from '../../../appServices';
import { DataRow, FreqDistribAPI, APIResponse } from '../../../common/api/kontext/freqs';
import { FreqBarModelStateBase, stateToAPIArgs } from '../../../common/models/freq';
import { ActionName as GlobalActionName, Actions as GlobalActions } from '../../../models/actions';
import { ActionName, Actions, DataLoadedPayload } from './actions';
import { DataApi } from '../../../common/types';
import { TooltipValues } from '../../../views/global';
import { LemmaVariant } from '../../../common/query';
import { ConcApi, QuerySelector, mkMatchQuery } from '../../../common/api/kontext/concordance';
import { callWithExtraVal } from '../../../common/api/util';
import { ViewMode } from '../../../common/api/abstract/concordance';

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

export interface MultiWordGeoAreasModelState extends FreqBarModelStateBase {
    fcrit:string;
    currentLemmas:Immutable.List<LemmaVariant>;
    concIds:Immutable.List<string>;
    data:Immutable.List<Immutable.List<DataRow>>;
    areaCodeMapping:Immutable.Map<string, string>;
    tooltipArea:{tooltipX:number; tooltipY:number, caption: string, data:TooltipValues}|null;
    mapSVG:string;
    areaDiscFillColor:string;
    areaDiscTextColor:string;
    isAltViewMode:boolean;
    posQueryGenerator:[string, string];
}


export class MultiWordGeoAreasModel extends StatelessModel<MultiWordGeoAreasModelState> {

    private readonly tileId:number;

    private readonly waitForTile:number;

    private readonly appServices:AppServices;

    private readonly concApi:ConcApi;
    
    private readonly freqApi:FreqDistribAPI;

    private readonly mapLoader:DataApi<string, string>;

    constructor(dispatcher:IActionQueue, tileId:number, waitForTile:number, appServices:AppServices, concApi:ConcApi, freqApi:FreqDistribAPI,
            mapLoader:DataApi<string, string>, initState:MultiWordGeoAreasModelState) {
        super(dispatcher, initState);
        this.tileId = tileId;
        this.waitForTile = waitForTile;
        this.appServices = appServices;
        this.concApi = concApi;
        this.freqApi = freqApi;
        this.mapLoader = mapLoader;

        this.addActionHandler<GlobalActions.RequestQueryResponse>(
            GlobalActionName.RequestQueryResponse,
            (state, action) => {
                state.isBusy = true;
                state.error = null;
            },
            (state, action, dispatch) => {
                if (this.waitForTile) {
                    this.suspend((action:Action) => {
                        if (action.name === GlobalActionName.TileDataLoaded && action.payload['tileId'] === this.waitForTile) {
                            const payload = (action as GlobalActions.TileDataLoaded<{concIds:Array<string>;}>).payload;
                            const dataStream = combineLatest(
                                this.mapLoader.call('mapCzech.inline.svg'),
                                rxOf(...payload.concIds.map((value, index) => [index, value] as [number, string]))
                                .pipe(
                                    concatMap(([target, concId]) => callWithExtraVal(
                                        this.freqApi,
                                        stateToAPIArgs(state, concId),
                                        {
                                            concId: concId,
                                            targetId: target
                                        }
                                    ))
                                )
                            );

                            this.handleLoad(dataStream, state, dispatch);
                            return true;
                        }
                        return false;
                    });
                } else {
                    const dataStream = combineLatest(
                        this.mapLoader.call('mapCzech.inline.svg'),
                        rxOf(...state.currentLemmas.map((lemma, index) => [index, lemma] as [number, LemmaVariant])[Symbol.iterator]()).pipe(
                            concatMap(([target, lemmaVariant]) =>
                                callWithExtraVal(
                                    this.concApi,
                                    this.concApi.stateToArgs(
                                        {
                                            querySelector: QuerySelector.CQL,
                                            corpname: state.corpname,
                                            otherCorpname: undefined,
                                            subcname: null,
                                            subcDesc: null,
                                            kwicLeftCtx: -1,
                                            kwicRightCtx: 1,
                                            pageSize: 10,
                                            loadPage: 1,
                                            currPage: 1,
                                            shuffle: false,
                                            attr_vmode: 'mouseover',
                                            viewMode: ViewMode.KWIC,
                                            tileId: this.tileId,
                                            attrs: ['word'],
                                            metadataAttrs: [],
                                            concIds: [],
                                            queries: [],
                                            posQueryGenerator: state.posQueryGenerator
                                        },
                                        lemmaVariant,
                                        target,
                                        null
                                    ),
                                    {
                                        corpName: state.corpname,
                                        subcName: null,
                                        concId: null,
                                        targetId: target,
                                        origQuery: mkMatchQuery(lemmaVariant, state.posQueryGenerator)
                                    }
                                )
                            ),
                            concatMap(([resp, args]) => {
                                args.concId = resp.concPersistenceID;
                                return callWithExtraVal(
                                    this.freqApi,
                                    stateToAPIArgs(state, args.concId),
                                    args
                                )
                            })
                        )
                    );

                    this.handleLoad(dataStream, state, dispatch);
                }
            }
        );
        this.addActionHandler<Actions.PartialDataLoaded>(
            ActionName.PartialDataLoaded,
            (state, action) => {
                if (action.payload.tileId === this.tileId) {
                    if (action.error) {
                        state.data = Immutable.List(state.currentLemmas.map(_ => Immutable.List<DataRow>()));
                        state.error = action.error.message;
                        state.isBusy = false;

                    } else if (action.payload.data.length === 0) {
                        state.data = state.data.set(action.payload.targetId, Immutable.List<DataRow>());
                        state.concIds = state.concIds.set(action.payload.targetId, action.payload.concId);
                        state.isBusy = state.concIds.some(v => v === null);

                    } else {
                        state.data = state.data.set(action.payload.targetId, Immutable.List<DataRow>(action.payload.data));
                        state.concIds = state.concIds.set(action.payload.targetId, action.payload.concId);
                        state.isBusy = state.concIds.some(v => v === null);
                    }
                    state.mapSVG = action.payload.mapSVG;                    
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
                    state.tooltipArea = {
                        tooltipX: action.payload.tooltipX,
                        tooltipY: action.payload.tooltipY,
                        caption: `${action.payload.areaName} (${action.payload.areaIpmNorm.toFixed(2)} ipm)`,
                        data: state.currentLemmas.toMap().mapEntries<string, string>(([index, lemma]) => {
                            const areaData = action.payload.areaData.find(item => item.target === index);
                            return [
                                lemma.word,
                                areaData ?
                                    `${(100*areaData.ipm/action.payload.areaIpmNorm).toFixed(2)} % (${areaData.ipm} ipm)` :
                                    undefined
                            ]
                        }).toObject()
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
            (state, action) => {},
            (state, action, dispatch) => {
                if (action.payload['tileId'] === this.tileId) {
                    this.freqApi.getSourceDescription(this.tileId, this.appServices.getISO639UILang(), state.corpname)
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
            }
        );
    }

    private handleLoad(dataStream:Observable<[string, [APIResponse, {concId:string; targetId:number;}]]>, state:MultiWordGeoAreasModelState, dispatch:SEDispatcher):void {
        dataStream.pipe(
            reduce<[string, [APIResponse, {concId:string; targetId:number;}]], [boolean, Immutable.List<string>]>(([hasData, concIds], [mapSVG, [resp, args]]) =>
                [
                    (hasData || (resp.data && resp.data.length > 0)),
                    concIds.set(args.targetId, args.concId)
                ],
                [false, state.concIds]
            )
        )
        .subscribe(([hasData, concIds]) =>
            dispatch<GlobalActions.TileDataLoaded<DataLoadedPayload>>({
                name: GlobalActionName.TileDataLoaded,
                payload: {
                    tileId: this.tileId,
                    isEmpty: !hasData,
                    concIds: concIds.toArray()
                }
            })
        );
        
        dataStream.subscribe(
            ([mapSVG, [resp, args]]) => {
                dispatch<Actions.PartialDataLoaded>({
                    name: ActionName.PartialDataLoaded,
                    payload: {
                        tileId: this.tileId,
                        mapSVG: mapSVG,
                        data: resp.data,
                        concId: args.concId,
                        targetId: args.targetId
                    }
                });
            },
            error => {
                dispatch<Actions.PartialDataLoaded>({
                    name: ActionName.PartialDataLoaded,
                    payload: {
                        tileId: this.tileId,
                        mapSVG: null,
                        data: null,
                        concId: null,
                        targetId: null
                    },
                    error: error
                });
            }
        );
    }
}