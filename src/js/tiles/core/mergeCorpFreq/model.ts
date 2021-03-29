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

import { StatelessModel, IActionQueue, SEDispatcher } from 'kombo';
import { Observable, of as rxOf } from 'rxjs';
import { mergeMap, concatMap, map, reduce, tap } from 'rxjs/operators';
import { Dict, List, pipe } from 'cnc-tskit';

import { IAppServices } from '../../../appServices';
import { SourceMappedDataRow } from '../../../api/vendor/kontext/freqs';
import { callWithExtraVal } from '../../../api/util';
import { ActionName as GlobalActionName, Actions as GlobalActions } from '../../../models/actions';
import { QueryMatch } from '../../../query/index';
import { ViewMode, SingleConcLoadedPayload, IConcordanceApi } from '../../../api/abstract/concordance';
import { DataLoadedPayload, ModelSourceArgs } from './common';
import { createInitialLinesData } from '../../../models/tiles/concordance';
import { IFreqDistribAPI, DataRow } from '../../../api/abstract/freqs';
import { ActionName, Actions } from './actions';
import { TooltipValues } from '../../../views/global';
import { AttrViewMode } from '../../../api/vendor/kontext/types';


export interface MergeCorpFreqModelState {
    isBusy:boolean;
    isAltViewMode:boolean;
    error:string;
    data:Array<Array<SourceMappedDataRow>>;
    sources:Array<ModelSourceArgs>;
    pixelsPerCategory:number;
    queryMatches:Array<QueryMatch>;
    tooltipData:{tooltipX:number; tooltipY:number, data:TooltipValues, caption:string}|null;
}

interface SourceQueryProps {
    sourceArgs:ModelSourceArgs;
    queryId:number;
    concId:string;
}

type LoadedConcProps = [number, ModelSourceArgs, string];


export interface MergeCorpFreqModelArgs {
    dispatcher:IActionQueue;
    tileId:number;
    waitForTiles:Array<number>;
    waitForTilesTimeoutSecs:number;
    appServices:IAppServices;
    concApi:IConcordanceApi<{}>;
    freqApi:IFreqDistribAPI<{}>;
    initState:MergeCorpFreqModelState;
}

export class MergeCorpFreqModel extends StatelessModel<MergeCorpFreqModelState, {[key:string]:number}> {

    private readonly appServices:IAppServices;

    private readonly tileId:number;

    private readonly concApi:IConcordanceApi<{}>;

    private readonly freqApi:IFreqDistribAPI<{}>;

    private readonly waitForTiles:Array<number>;

    private readonly waitForTilesTimeoutSecs:number;

    constructor({dispatcher, tileId, waitForTiles, waitForTilesTimeoutSecs, appServices,
                concApi, freqApi, initState}:MergeCorpFreqModelArgs) {
        super(dispatcher, initState);
        this.tileId = tileId;
        this.appServices = appServices;
        this.waitForTiles = waitForTiles;
        this.waitForTilesTimeoutSecs = waitForTilesTimeoutSecs;
        this.concApi = concApi;
        this.freqApi = freqApi;

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
                const conc$ = this.waitForTiles.length > 0 ?
                    this.suspendWithTimeout(
                        this.waitForTilesTimeoutSecs * 1000,
                        pipe(
                            this.waitForTiles,
                            List.map<number, [string, number]>(v => [v.toFixed(), 0]),
                            Dict.fromEntries()
                        ),
                        (action, syncData) => {
                            if (action.name === GlobalActionName.TilePartialDataLoaded && this.waitForTiles.indexOf(action.payload['tileId']) > -1) {
                                const ans = {...syncData};
                                ans[action.payload['tileId'].toFixed()] += 1;
                                return Dict.find(v => v < state.queryMatches.length, ans) ? ans : null;
                            }
                            return syncData;

                        }
                    ).pipe(
                        map(action => {
                            const payload = (action as GlobalActions.TilePartialDataLoaded<SingleConcLoadedPayload>).payload;
                            const src = List.find(
                                v => v.corpname === payload.data.corpName &&
                                        (!v.subcname || v.subcname === payload.data.subcorpName),
                                state.sources
                            );
                            return [payload.queryId, src, payload.data.concPersistenceID] as LoadedConcProps;
                        })
                    ) :
                    this.loadConcordances(state);
                this.loadFreqs(conc$, dispatch);
            }
        );

        this.addActionHandler<GlobalActions.TilePartialDataLoaded<DataLoadedPayload>>(
            GlobalActionName.TilePartialDataLoaded,
            (state, action) => {
                if (action.payload.tileId === this.tileId) {
                    if (state.data[action.payload.queryId] === undefined) {
                        state.data[action.payload.queryId] = [];
                    }

                    state.data[action.payload.queryId] = pipe(
                        state.data[action.payload.queryId],
                        List.concat(action.payload.data.length > 0 ?
                            action.payload.data :
                            [{
                                sourceId: action.payload.sourceId,
                                name: action.payload.valuePlaceholder,
                                freq: 0,
                                ipm: 0,
                                norm: 0,
                                backlink: null
                            }]
                        ),
                        List.filter(v =>  !!v.name)
                    );
                }
            }
        );

        this.addActionHandler<GlobalActions.TileDataLoaded<{}>>(
            GlobalActionName.TileDataLoaded,
            (state, action) => {
                if (action.payload.tileId === this.tileId) {
                    state.isBusy = false;
                    if (action.error) {
                        state.data = [];
                        state.error = this.appServices.normalizeHttpApiError(action.error);
                    }
                }
            }
        )

        this.addActionHandler<GlobalActions.GetSourceInfo>(
            GlobalActionName.GetSourceInfo,
            (state, action) => {},
            (state, action, dispatch) => {
                if (action.payload['tileId'] === this.tileId) {
                    this.freqApi.getSourceDescription(this.tileId,
                        this.appServices.getISO639UILang(), action.payload['corpusId'])
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

        this.addActionHandler<Actions.ShowTooltip>(
            ActionName.ShowTooltip,
            (state, action) => {
                if (action.payload.tileId === this.tileId) {
                    state.tooltipData = {
                        tooltipX: action.payload.tooltipX,
                        tooltipY: action.payload.tooltipY,
                        caption: state.data.length > 0 ? state.data[0][action.payload.dataId]?.name : '-',
                        data: state.queryMatches.length > 1 ?
                            Dict.fromEntries(
                                List.map((v, i) =>
                                    ([v.word, [
                                        {value: state.data[i] && state.data[i][action.payload.dataId] ? state.data[i][action.payload.dataId].ipm : 0, unit: `ipm, ${appServices.translate('global__frequency')}`},
                                        {value: state.data[i] && state.data[i][action.payload.dataId] ? state.data[i][action.payload.dataId].freq : 0}
                                    ]]),
                                    state.queryMatches
                                )
                            ) : {
                                [appServices.translate('mergeCorpFreq__rel_freq')]: [{value: state.data[0][action.payload.dataId].ipm}],
                                [appServices.translate('mergeCorpFreq__abs_freq')]: [{value: state.data[0][action.payload.dataId].freq}]
                            }
                    };
                }
            }
        );

        this.addActionHandler<Actions.HideTooltip>(
            ActionName.HideTooltip,
            (state, action) => {
                if (action.payload.tileId === this.tileId) {
                    state.tooltipData = null;
                }
            }
        );
    }

    private loadConcordances(state:MergeCorpFreqModelState):Observable<[number, ModelSourceArgs, string]> {
        return rxOf(...state.sources).pipe(
            mergeMap(source => rxOf(...List.map(
                (v, i) => [i, source, v] as [number, ModelSourceArgs, QueryMatch],
                state.queryMatches))),
            concatMap(([queryId, args, lemma]) =>
                callWithExtraVal(
                    this.concApi,
                    this.concApi.stateToArgs(
                        {
                            corpname: args.corpname,
                            otherCorpname: undefined,
                            subcname: args.subcname,
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
                            concordances: createInitialLinesData(state.queryMatches.length),
                            posQueryGenerator: ['tag', 'ppTagset'] // TODO configuration
                        },
                        lemma,
                        queryId,
                        null
                    ),
                    [args, queryId] as [ModelSourceArgs, number]
                )
            ),
            map(
                ([resp, [args, queryId]]) => [queryId, args, resp.concPersistenceID]
            )
        );
    }

    private loadFreqs(conc$:Observable<[number, ModelSourceArgs, string]>, dispatch:SEDispatcher):void {
        conc$.pipe(
            mergeMap(([queryId, sourceArgs, concId]) => {
                const auxArgs:SourceQueryProps = {
                    sourceArgs: sourceArgs,
                    queryId: queryId,
                    concId: concId
                };
                return callWithExtraVal(
                    this.freqApi,
                    this.freqApi.stateToArgs(sourceArgs, concId),
                    auxArgs
                );
            }),
            map(
                ([resp, args]) => {
                    const dataNorm:Array<DataRow> =
                        args.sourceArgs.isSingleCategory ?
                            [resp.data.reduce<DataRow>(
                                (acc, curr) => ({
                                    name: '',
                                    freq: acc.freq + curr.freq,
                                    ipm: undefined,
                                    norm: undefined,
                                    order: undefined,
                                    backlink: undefined

                                }),
                                {
                                    name: '',
                                    freq: 0,
                                    ipm: undefined,
                                    norm: undefined,
                                    order: undefined
                                }
                            )] :
                            resp.data;
                    const ans:[Array<DataRow>, SourceQueryProps] = [dataNorm, args];
                    return ans;
                }
            ),
            map(
                ([data, props]) => {
                    const ans:[Array<SourceMappedDataRow>, SourceQueryProps] = [
                        List.map(
                            row => {
                                const name = props.sourceArgs.valuePlaceholder ?
                                    props.sourceArgs.valuePlaceholder :
                                    this.appServices.translateResourceMetadata(props.sourceArgs.corpname, row.name);
                                return row.ipm ?
                                    {
                                        sourceId: props.sourceArgs.uuid,
                                        queryId: props.queryId,
                                        backlink: this.freqApi.createBacklink(props.sourceArgs, props.sourceArgs.backlinkTpl, props.concId),
                                        freq: row.freq,
                                        ipm: row.ipm,
                                        norm: row.norm,
                                        name: name
                                    } :
                                    {
                                        sourceId: props.sourceArgs.uuid,
                                        queryId: props.queryId,
                                        backlink: this.freqApi.createBacklink(props.sourceArgs, props.sourceArgs.backlinkTpl, props.concId),
                                        freq: row.freq,
                                        ipm: Math.round(row.freq / props.sourceArgs.corpusSize * 1e8) / 100,
                                        norm: row.norm,
                                        name: name
                                    };
                            },
                            data
                        ),
                        props
                    ];
                    return ans;
                }
            ),
            tap(
                ([data, srcProps]) => {
                    dispatch<GlobalActions.TilePartialDataLoaded<DataLoadedPayload>>({
                        name: GlobalActionName.TilePartialDataLoaded,
                        payload: {
                            tileId: this.tileId,
                            queryId: srcProps.queryId,
                            concId: srcProps.concId,
                            sourceId: srcProps.sourceArgs.uuid,
                            data: data,
                            valuePlaceholder: srcProps.sourceArgs.valuePlaceholder
                        }
                    });
                }
            ),
            reduce(
                (acc, [data,]) => acc && pipe(
                    data,
                    List.every(v => v && v.freq === 0)
                ),
                true
            )
        ).subscribe(
            (isEmpty) => dispatch<GlobalActions.TileDataLoaded<{}>>({
                name: GlobalActionName.TileDataLoaded,
                payload: {
                    tileId: this.tileId,
                    isEmpty: isEmpty
                }
            }),
            err => {
                dispatch<GlobalActions.TileDataLoaded<{}>>({
                    name: GlobalActionName.TileDataLoaded,
                    error: err,
                    payload: {
                        tileId: this.tileId,
                        isEmpty: true
                    }
                });
            }
        );
    }
}
