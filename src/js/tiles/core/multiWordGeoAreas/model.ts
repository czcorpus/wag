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
import { Observable, of as rxOf, zip } from 'rxjs';
import { concatMap, reduce, share, repeat } from 'rxjs/operators';
import { Dict, List, pipe, tuple } from 'cnc-tskit';

import { IAppServices } from '../../../appServices';
import { GeneralSingleCritFreqMultiQueryState } from '../../../models/tiles/freq';
import { ActionName as GlobalActionName, Actions as GlobalActions } from '../../../models/actions';
import { ActionName, Actions, LoadFinishedPayload } from './actions';
import { DataApi } from '../../../types';
import { TooltipValues } from '../../../views/global';
import { QueryMatch, RecognizedQueries } from '../../../query/index';
import { callWithExtraVal } from '../../../api/util';
import { ViewMode, IConcordanceApi } from '../../../api/abstract/concordance';
import { createInitialLinesData } from '../../../models/tiles/concordance';
import { ConcLoadedPayload, isConcLoadedPayload } from '../concordance/actions';
import { DataRow, IFreqDistribAPI, APIResponse } from '../../../api/abstract/freqs';

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

export interface MultiWordGeoAreasModelState extends GeneralSingleCritFreqMultiQueryState<DataRow> {
    currQueryMatches:Array<QueryMatch>;
    areaCodeMapping:{[key:string]:string};
    tooltipArea:{tooltipX:number; tooltipY:number, caption:string, data:TooltipValues, multiWordMode:boolean}|null;
    mapSVG:string;
    isAltViewMode:boolean;
    posQueryGenerator:[string, string];
    frequencyDisplayLimit:number;
}

interface MultiWordGeoAreasModelArgs {
    dispatcher:IActionQueue;
    tileId:number;
    waitForTile:number;
    waitForTilesTimeoutSecs:number;
    appServices:IAppServices;
    queryMatches:RecognizedQueries;
    concApi:IConcordanceApi<{}>;
    freqApi:IFreqDistribAPI<{}>;
    mapLoader:DataApi<string, string>;
    initState:MultiWordGeoAreasModelState;
}

export class MultiWordGeoAreasModel extends StatelessModel<MultiWordGeoAreasModelState> {

    private readonly tileId:number;

    private readonly waitForTile:number;

    private readonly waitForTilesTimeoutSecs:number;

    private readonly appServices:IAppServices;

    private readonly concApi:IConcordanceApi<{}>;

    private readonly freqApi:IFreqDistribAPI<{}>;

    private readonly mapLoader:DataApi<string, string>;

    private readonly queryMatches:Array<Array<QueryMatch>>;

    constructor({dispatcher, tileId, waitForTile, waitForTilesTimeoutSecs, appServices, queryMatches,
                concApi, freqApi, mapLoader, initState}:MultiWordGeoAreasModelArgs) {
        super(dispatcher, initState);
        this.tileId = tileId;
        this.waitForTile = waitForTile;
        this.waitForTilesTimeoutSecs = waitForTilesTimeoutSecs;
        this.appServices = appServices;
        this.queryMatches = queryMatches;
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
                    this.suspendWithTimeout(
                        this.waitForTilesTimeoutSecs * 1000,
                        {},
                        (action, syncData) => {
                            if (action.name === GlobalActionName.TileDataLoaded && action.payload['tileId'] === this.waitForTile) {
                                let dataStream;
                                if (isConcLoadedPayload(action.payload)) {
                                    const payload = (action as GlobalActions.TileDataLoaded<ConcLoadedPayload>).payload;
                                    dataStream = zip(
                                        this.mapLoader.call('mapCzech.inline.svg').pipe(repeat(payload.concPersistenceIDs.length)),
                                        rxOf(...payload.concPersistenceIDs.map((concId, queryId) => [queryId, concId] as [number, string]))
                                        .pipe(
                                            concatMap(([queryId, concId]) => callWithExtraVal(
                                                this.freqApi,
                                                this.freqApi.stateToArgs(state, concId),
                                                {
                                                    concId: concId,
                                                    queryId: queryId
                                                }
                                            ))
                                        )
                                    );
                                } else {
                                    dataStream = this.getConcordances(state);
                                }

                                this.handleLoad(dataStream, state, dispatch);
                                return null;
                            }
                            return syncData;
                        }
                    );

                } else {
                    const dataStream = this.getConcordances(state);
                    this.handleLoad(dataStream, state, dispatch);
                }
            }
        );
        this.addActionHandler<Actions.PartialDataLoaded>(
            ActionName.PartialDataLoaded,
            (state, action) => {
                if (action.payload.tileId === this.tileId) {
                    if (action.error) {
                        state.data = state.currQueryMatches.map(_ => []);
                        state.error = action.error.message;

                    } else if (action.payload.data.length === 0) {
                        state.data[action.payload.queryId] = [];

                    } else {
                        state.data[action.payload.queryId] = action.payload.data;
                    }
                    state.mapSVG = action.payload.mapSVG;
                }
            }
        );
        this.addActionHandler<GlobalActions.TileDataLoaded<LoadFinishedPayload>>(
            GlobalActionName.TileDataLoaded,
            (state, action) => {
                if (action.payload.tileId === this.tileId) {
                    state.isBusy = false;
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
                        caption: action.payload.areaName
                            + (action.payload.areaData === null ?
                                '' :
                                ` (${this.appServices.formatNumber(action.payload.areaIpmNorm, 1)} ipm)`),
                        data: action.payload.areaData === null ?
                            {[appServices.translate('multi_word_geolocations__not_enough_data')]: [{value: ''}]} :
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
                            ),
                        multiWordMode: action.payload.areaData !== null
                    }
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

    private getConcordances(state:MultiWordGeoAreasModelState) {
        return zip(
            this.mapLoader.call('mapCzech.inline.svg').pipe(repeat(state.currQueryMatches.length)),
            rxOf(...state.currQueryMatches.map((lemma, queryId) => [queryId, lemma] as [number, QueryMatch])[Symbol.iterator]()).pipe(
                concatMap(([queryId, lemmaVariant]) =>
                    callWithExtraVal(
                        this.concApi,
                        this.concApi.stateToArgs(
                            {
                                corpname: state.corpname,
                                otherCorpname: undefined,
                                subcname: null,
                                subcDesc: null,
                                kwicLeftCtx: -1,
                                kwicRightCtx: 1,
                                pageSize: 10,
                                shuffle: false,
                                attr_vmode: 'mouseover',
                                viewMode: ViewMode.KWIC,
                                tileId: this.tileId,
                                attrs: [],
                                metadataAttrs: [],
                                queries: [],
                                concordances: createInitialLinesData(this.queryMatches.length),
                                posQueryGenerator: state.posQueryGenerator
                            },
                            lemmaVariant,
                            queryId,
                            null
                        ),
                        {
                            corpName: state.corpname,
                            subcName: null,
                            concId: null,
                            queryId: queryId,
                            origQuery: this.concApi.mkMatchQuery(lemmaVariant, state.posQueryGenerator)
                        }
                    )
                ),
                concatMap(([resp, args]) => {
                    args.concId = resp.concPersistenceID;
                    return callWithExtraVal(
                        this.freqApi,
                        this.freqApi.stateToArgs(state, args.concId),
                        args
                    )
                })
            ).pipe(share())
        );
    }

    private handleLoad(
        dataStream:Observable<[string, [APIResponse, {concId:string; queryId:number;}]]>,
        state:MultiWordGeoAreasModelState,
        dispatch:SEDispatcher
    ):void {
        dataStream.subscribe(
            ([mapSVG, [resp, args]]) => {
                dispatch<Actions.PartialDataLoaded>({
                    name: ActionName.PartialDataLoaded,
                    payload: {
                        tileId: this.tileId,
                        mapSVG: mapSVG,
                        data: resp.data,
                        concId: args.concId,
                        queryId: args.queryId
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
                        queryId: null
                    },
                    error: error
                });
            }
        );

        dataStream.pipe(
            reduce<[string, [APIResponse, {concId:string; queryId:number;}]], {hasData:boolean, concIds:Array<string>}>(
                (acc, [_, [resp, args]]) => {
                    acc.hasData = acc.hasData || (resp.data && resp.data.length > 0);
                    acc.concIds[args.queryId] = args.concId;
                    return acc
                },
                {hasData: false, concIds: this.queryMatches.map(_ => null)}
            )
        )
        .subscribe(acc =>
            dispatch<GlobalActions.TileDataLoaded<LoadFinishedPayload>>({
                name: GlobalActionName.TileDataLoaded,
                payload: {
                    tileId: this.tileId,
                    isEmpty: !acc.hasData,
                    corpusName: state.corpname,
                    concPersistenceIDs: acc.concIds
                }
            })
        );
    }
}