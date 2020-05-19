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
import { flatMap, concatMap, map, reduce, tap } from 'rxjs/operators';
import { Dict, List, pipe } from 'cnc-tskit';

import { IAppServices } from '../../../appServices';
import { SourceMappedDataRow } from '../../../common/api/kontext/freqs';
import { callWithExtraVal } from '../../../common/api/util';
import { ActionName as GlobalActionName, Actions as GlobalActions } from '../../../models/actions';
import { QueryMatch } from '../../../common/query/index';
import { ViewMode, SingleConcLoadedPayload, IConcordanceApi } from '../../../common/api/abstract/concordance';
import { DataLoadedPayload, ModelSourceArgs } from './common';
import { createInitialLinesData } from '../../../common/models/concordance';
import { IFreqDistribAPI, DataRow } from '../../../common/api/abstract/freqs';


export interface MergeCorpFreqModelState {
    isBusy:boolean;
    isAltViewMode:boolean;
    error:string;
    data:Array<Array<SourceMappedDataRow>>;
    sources:Array<ModelSourceArgs>;
    pixelsPerCategory:number;
    queryMatches:Array<QueryMatch>;
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
                            const src = List.find(v => v.corpname === payload.data.corpName, state.sources);
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
                        state.error = action.error.message;
                    }
                }
            }
        )

        this.addActionHandler<GlobalActions.GetSourceInfo>(
            GlobalActionName.GetSourceInfo,
            (state, action) => {},
            (state, action, dispatch) => {
                if (action.payload['tileId'] === this.tileId) {
                    this.freqApi.getSourceDescription(this.tileId, this.appServices.getISO639UILang(), action.payload['corpusId'])
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

    private loadConcordances(state:MergeCorpFreqModelState):Observable<[number, ModelSourceArgs, string]> {
        return rxOf(...state.sources).pipe(
            flatMap(source => rxOf(...List.map(
                (v, i) => [i, source, v] as [number, ModelSourceArgs, QueryMatch],
                state.queryMatches))),
            concatMap(([queryId, args, lemma]) =>
                callWithExtraVal(
                    this.concApi,
                    this.concApi.stateToArgs(
                        {
                            corpname: args.corpname,
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
            flatMap(([queryId, sourceArgs, concId]) => {
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
                                    this.appServices.translateDbValue(props.sourceArgs.corpname, row.name);
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
