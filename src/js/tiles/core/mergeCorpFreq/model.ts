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
import { Dict, List, pipe, tuple } from 'cnc-tskit';

import { IAppServices } from '../../../appServices.js';
import { SourceMappedDataRow } from '../../../api/vendor/kontext/freqs.js';
import { callWithExtraVal } from '../../../api/util.js';
import { Actions as GlobalActions } from '../../../models/actions.js';
import { QueryMatch } from '../../../query/index.js';
import { ViewMode, IConcordanceApi } from '../../../api/abstract/concordance.js';
import { ModelSourceArgs } from './common.js';
import { createInitialLinesData } from '../../../models/tiles/concordance/index.js';
import { IFreqDistribAPI, DataRow } from '../../../api/abstract/freqs.js';
import { Actions } from './actions.js';
import { TooltipValues } from '../../../views/common/index.js';
import { Actions as ConcActions } from '../concordance/actions.js';
import { isWebDelegateApi } from '../../../types.js';
import { Backlink, BacklinkWithArgs, createAppBacklink } from '../../../page/tile.js';


export interface MergeCorpFreqModelState {
    isBusy:boolean;
    isAltViewMode:boolean;
    error:string;
    data:Array<Array<SourceMappedDataRow>>;
    sources:Array<ModelSourceArgs>;
    pixelsPerCategory:number;
    queryMatches:Array<QueryMatch>;
    tooltipData:{tooltipX:number; tooltipY:number, data:TooltipValues, caption:string}|null;
    appBacklink:BacklinkWithArgs<{}>;
}

interface SourceQueryProps {
    sourceArgs:ModelSourceArgs;
    queryId:number;
    concId:string;
}


export interface MergeCorpFreqModelArgs {
    dispatcher:IActionQueue;
    tileId:number;
    waitForTiles:Array<number>;
    waitForTilesTimeoutSecs:number;
    appServices:IAppServices;
    concApi:IConcordanceApi<{}>;
    freqApi:IFreqDistribAPI<{}>;
    initState:MergeCorpFreqModelState;
    backlink:Backlink;
}

export class MergeCorpFreqModel extends StatelessModel<MergeCorpFreqModelState> {

    private readonly appServices:IAppServices;

    private readonly tileId:number;

    private readonly concApi:IConcordanceApi<{}>;

    private readonly freqApi:IFreqDistribAPI<{}>;

    private readonly waitForTiles:Array<number>;

    private readonly waitForTilesTimeoutSecs:number;

    private readonly backlink:Backlink;

    constructor({dispatcher, tileId, waitForTiles, waitForTilesTimeoutSecs, appServices,
                concApi, freqApi, initState, backlink}:MergeCorpFreqModelArgs) {
        super(dispatcher, initState);
        this.tileId = tileId;
        this.appServices = appServices;
        this.waitForTiles = waitForTiles;
        this.waitForTilesTimeoutSecs = waitForTilesTimeoutSecs;
        this.concApi = concApi;
        this.freqApi = freqApi;
        this.backlink = !backlink?.isAppUrl && isWebDelegateApi(this.freqApi) ? this.freqApi.getBackLink(backlink) : backlink;

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
                const conc$ = this.waitForTiles.length > 0 ?
                    this.waitForActionWithTimeout(
                        this.waitForTilesTimeoutSecs * 1000,
                        pipe(
                            this.waitForTiles,
                            List.map<number, [string, number]>(v => [v.toFixed(), 0]),
                            Dict.fromEntries()
                        ),
                        (action, syncData) => {
                            if (ConcActions.isPartialTileDataLoaded(action) && this.waitForTiles.indexOf(action.payload.tileId) > -1) {
                                const ans = {...syncData};
                                ans[action.payload['tileId'].toFixed()] += 1;
                                return Dict.find(v => v < state.queryMatches.length, ans) ? ans : null;
                            }
                            return syncData;

                        }
                    ).pipe(
                        map(action => {
                            if (ConcActions.isPartialTileDataLoaded(action)) {
                                const src = List.find(
                                    v => v.corpname === action.payload.data.corpName &&
                                            (!v.subcname || v.subcname === action.payload.data.subcorpName),
                                    state.sources
                                );
                                return tuple(action.payload.queryId, src, action.payload.data.concPersistenceID)

                            } else {
                                throw new Error(`Invalid action: ${action.name}`);
                            }
                        })
                    ) :
                    this.concApi === null ?
                        rxOf(...state.sources).pipe(
                            mergeMap(source => rxOf(
                                ...List.map(
                                    (v, i) => [i, source, v.lemma] as [number, ModelSourceArgs, string],
                                    state.queryMatches
                                ),
                            )),
                        ) :
                        this.loadConcordances(state);
                this.loadFreqs(conc$, dispatch);
            }
        );

        this.addActionHandler<typeof Actions.PartialTileDataLoaded>(
            Actions.PartialTileDataLoaded.name,
            (state, action) => {
                if (action.payload.tileId === this.tileId) {
                    if (this.backlink !== null && this.backlink.isAppUrl && state.appBacklink === null) {
                        state.appBacklink = createAppBacklink(this.backlink);
                    }

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
                                backlink: null,
                                uniqueColor: false
                            }]
                        ),
                        List.filter(v => !!v.name),
                        List.sortAlphaBy(v => {
                            const idx = List.findIndex(s => s.uuid === v.sourceId, state.sources);
                            return `${idx}${v.name}`;
                        })
                    );
                }
            }
        );

        this.addActionHandler<typeof Actions.TileDataLoaded>(
            Actions.TileDataLoaded.name,
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

        this.addActionHandler<typeof GlobalActions.GetSourceInfo>(
            GlobalActions.GetSourceInfo.name,
            (state, action) => {},
            (state, action, dispatch) => {
                if (action.payload.tileId === this.tileId) {
                    this.freqApi.getSourceDescription(this.tileId,
                        this.appServices.getISO639UILang(), action.payload.corpusId)
                    .subscribe({
                        next: data => {
                            dispatch({
                                name: GlobalActions.GetSourceInfoDone.name,
                                payload: {
                                    tileId: this.tileId,
                                    data: data
                                }
                            });
                        },
                        error: err => {
                            console.error(err);
                            dispatch({
                                name: GlobalActions.GetSourceInfoDone.name,
                                error: err,
                                payload: {
                                    tileId: this.tileId
                                }
                            });
                        }
                    });
                }
            }
        );

        this.addActionSubtypeHandler(
            Actions.ShowTooltip,
            action => action.payload.tileId === this.tileId && action.payload.dataName !== undefined,
            (state, action) => {
                state.tooltipData = {
                    tooltipX: action.payload.tooltipX,
                    tooltipY: action.payload.tooltipY,
                    caption: state.data.length > 0 ? action.payload.dataName : '-',
                    data: state.queryMatches.length > 1 ?
                        Dict.fromEntries(
                            List.map((v, i) => {
                                    const index = List.findIndex(v => v.name === action.payload.dataName, state.data[i]);
                                    return ([v.word, [
                                        {value: state.data[i] && index >= 0 && state.data[i][index] ? state.data[i][index].ipm : 0, unit: `ipm, ${appServices.translate('global__frequency')}`},
                                        {value: state.data[i] && index >= 0 && state.data[i][index] ? state.data[i][index].freq : 0}
                                    ]])
                                },
                                state.queryMatches
                            )
                        ) : {
                            [appServices.translate('mergeCorpFreq__rel_freq')]: [{value: state.data[0][List.findIndex(v => v.name === action.payload.dataName, state.data[0])].ipm}],
                            [appServices.translate('mergeCorpFreq__abs_freq')]: [{value: state.data[0][List.findIndex(v => v.name === action.payload.dataName, state.data[0])].freq}]
                        }
                };
            }
        );

        this.addActionHandler<typeof Actions.HideTooltip>(
            Actions.HideTooltip.name,
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
                    this.tileId,
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
                    this.tileId,
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
                                    backlink: undefined,
                                    barColor: undefined

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
                                        backlink: this.freqApi.createBacklink(props.sourceArgs, props.sourceArgs.backlinkTpl ? props.sourceArgs.backlinkTpl : this.backlink, props.concId),
                                        freq: row.freq,
                                        ipm: row.ipm,
                                        norm: row.norm,
                                        name,
                                        uniqueColor: props.sourceArgs.uniqueColor
                                    } :
                                    {
                                        sourceId: props.sourceArgs.uuid,
                                        queryId: props.queryId,
                                        backlink: this.freqApi.createBacklink(props.sourceArgs, props.sourceArgs.backlinkTpl ? props.sourceArgs.backlinkTpl : this.backlink, props.concId),
                                        freq: row.freq,
                                        ipm: Math.round(row.freq / props.sourceArgs.corpusSize * 1e8) / 100,
                                        norm: row.norm,
                                        name,
                                        uniqueColor: props.sourceArgs.uniqueColor
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
                    dispatch<typeof Actions.PartialTileDataLoaded>({
                        name: Actions.PartialTileDataLoaded.name,
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
        ).subscribe({
            next: (isEmpty) => dispatch<typeof Actions.TileDataLoaded>({
                name: Actions.TileDataLoaded.name,
                payload: {
                    tileId: this.tileId,
                    isEmpty: isEmpty
                }
            }),
            error: err => {
                dispatch<typeof Actions.TileDataLoaded>({
                    name: GlobalActions.TileDataLoaded.name,
                    error: err,
                    payload: {
                        tileId: this.tileId,
                        isEmpty: true
                    }
                });
            }
        });
    }
}
