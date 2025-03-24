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
import { Dict, List, tuple } from 'cnc-tskit';

import { IAppServices } from '../../../appServices.js';
import { GeneralSingleCritFreqMultiQueryState } from '../../../models/tiles/freq.js';
import { Actions as GlobalActions } from '../../../models/actions.js';
import { Actions } from './actions.js';
import { Actions as ConcActions } from '../concordance/actions.js';
import { DataApi, isWebDelegateApi } from '../../../types.js';
import { TooltipValues } from '../../../views/common/index.js';
import { QueryMatch, RecognizedQueries } from '../../../query/index.js';
import { callWithExtraVal } from '../../../api/util.js';
import { ViewMode, IConcordanceApi } from '../../../api/abstract/concordance.js';
import { createInitialLinesData } from '../../../models/tiles/concordance/index.js';
import { DataRow, IFreqDistribAPI, APIResponse } from '../../../api/abstract/freqs.js';
import { Backlink, BacklinkWithArgs, createAppBacklink } from '../../../page/tile.js';

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
    backlinks:Array<BacklinkWithArgs<{}>>;
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
    backlink:Backlink;
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

    private readonly backlink:Backlink;

    constructor({dispatcher, tileId, waitForTile, waitForTilesTimeoutSecs, appServices, queryMatches,
                concApi, freqApi, mapLoader, initState, backlink}:MultiWordGeoAreasModelArgs) {
        super(dispatcher, initState);
        this.tileId = tileId;
        this.waitForTile = waitForTile;
        this.waitForTilesTimeoutSecs = waitForTilesTimeoutSecs;
        this.appServices = appServices;
        this.queryMatches = queryMatches;
        this.concApi = concApi;
        this.freqApi = freqApi;
        this.mapLoader = mapLoader;
        this.backlink = !backlink?.isAppUrl && isWebDelegateApi(this.freqApi) ? this.freqApi.getBackLink(backlink) : backlink;

        this.addActionHandler<typeof GlobalActions.RequestQueryResponse>(
            GlobalActions.RequestQueryResponse.name,
            (state, action) => {
                state.isBusy = true;
                state.backlinks = [];
                state.error = null;
            },
            (state, action, dispatch) => {
                if (this.waitForTile) {
                    this.waitForActionWithTimeout(
                        this.waitForTilesTimeoutSecs * 1000,
                        {},
                        (action, syncData) => {
                            if (ConcActions.isTileDataLoaded(action) && action.payload.tileId === this.waitForTile) {
                                const dataStream = zip(
                                    this.mapLoader.call(this.tileId, true, 'mapCzech.inline.svg').pipe(
                                        repeat(action.payload.concPersistenceIDs.length)),
                                    rxOf(...List.map(
                                        (concId, queryId) => tuple(queryId, concId),
                                        action.payload.concPersistenceIDs
                                    ))
                                    .pipe(
                                        concatMap(([queryId, concId]) => callWithExtraVal(
                                            this.freqApi,
                                            this.tileId,
                                            true,
                                            this.freqApi.stateToArgs(state, concId),
                                            {
                                                concId: concId,
                                                queryId: queryId
                                            }
                                        ))
                                    )
                                );
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
        this.addActionHandler<typeof Actions.PartialTileDataLoaded>(
            Actions.PartialTileDataLoaded.name,
            (state, action) => {
                if (action.payload.tileId === this.tileId) {
                    if (action.error) {
                        state.data = state.currQueryMatches.map(_ => []);
                        state.backlinks = [];
                        state.error = this.appServices.normalizeHttpApiError(action.error);

                    } else if (action.payload.data.length === 0) {
                        state.data[action.payload.queryId] = [];

                    } else {
                        state.data[action.payload.queryId] = action.payload.data;
                        if (this.backlink?.isAppUrl) {
                            state.backlinks = [createAppBacklink(this.backlink)];
                        } else {
                            state.backlinks.push(this.freqApi.createBacklink(state, this.backlink, action.payload.concId));
                        }
                    }
                    state.mapSVG = action.payload.mapSVG;
                }
            }
        );
        this.addActionHandler<typeof Actions.TileDataLoaded>(
            Actions.TileDataLoaded.name,
            (state, action) => {
                if (action.payload.tileId === this.tileId) {
                    state.isBusy = false;
                }
            }
        );
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
        this.addActionHandler<typeof Actions.ShowAreaTooltip>(
            Actions.ShowAreaTooltip.name,
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
        this.addActionHandler<typeof Actions.HideAreaTooltip>(
            Actions.HideAreaTooltip.name,
            (state, action) => {
                if (action.payload.tileId === this.tileId) {
                    state.tooltipArea = null;
                }
            }
        );
        this.addActionHandler<typeof GlobalActions.GetSourceInfo>(
            GlobalActions.GetSourceInfo.name,
            (state, action) => {},
            (state, action, dispatch) => {
                if (action.payload.tileId === this.tileId) {
                    this.freqApi.getSourceDescription(this.tileId, false, this.appServices.getISO639UILang(), state.corpname)
                    .subscribe({
                        next: (data) => {
                            dispatch<typeof GlobalActions.GetSourceInfoDone>({
                                name: GlobalActions.GetSourceInfoDone.name,
                                payload: {
                                    data
                                }
                            });
                        },
                        error: (error) => {
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
    }

    private getConcordances(state:MultiWordGeoAreasModelState) {
        return zip(
            this.mapLoader.call(this.tileId, true, 'mapCzech.inline.svg').pipe(repeat(state.currQueryMatches.length)),
            rxOf(...state.currQueryMatches.map((lemma, queryId) => [queryId, lemma] as [number, QueryMatch])[Symbol.iterator]()).pipe(
                concatMap(([queryId, lemmaVariant]) =>
                    callWithExtraVal(
                        this.concApi,
                        this.tileId,
                        true,
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
                        this.tileId,
                        true,
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
        dataStream.subscribe({
            next: ([mapSVG, [resp, args]]) => {
                dispatch<typeof Actions.PartialTileDataLoaded>({
                    name: Actions.PartialTileDataLoaded.name,
                    payload: {
                        tileId: this.tileId,
                        mapSVG,
                        data: resp.data,
                        concId: args.concId,
                        queryId: args.queryId
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
                        concId: null,
                        queryId: null
                    },
                    error: error
                });
            }
        });

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
            dispatch<typeof Actions.TileDataLoaded>({
                name: Actions.TileDataLoaded.name,
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