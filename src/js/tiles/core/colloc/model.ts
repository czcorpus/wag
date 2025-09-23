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
import { SEDispatcher, StatelessModel, IActionQueue } from 'kombo';
import { Observable, of as rxOf } from 'rxjs';
import { tap, reduce, mergeMap } from 'rxjs/operators';
import { List, pipe, tuple } from 'cnc-tskit';

import { IAppServices } from '../../../appServices.js';
import { SystemMessageType } from '../../../types.js';
import { Actions as GlobalActions } from '../../../models/actions.js';
import { Actions, CollocModelState, ctxToRange } from './common.js';
import { QueryMatch, QueryType, testIsDictMatch } from '../../../query/index.js';
import { MQueryCollAPI, MQueryCollArgs } from './api/index.js';
import { mkLemmaMatchQuery } from '../../../api/vendor/mquery/common.js';
import { IDataStreaming } from '../../../page/streaming.js';


export interface CollocModelArgs {
    dispatcher:IActionQueue;
    tileId:number;
    dependentTiles:Array<number>;
    appServices:IAppServices;
    service:MQueryCollAPI;
    initState:CollocModelState;
    queryMatches:Array<QueryMatch>;
}


type FreqRequestArgs = [number, QueryMatch];


export class CollocModel extends StatelessModel<CollocModelState> {

    private readonly collApi:MQueryCollAPI;

    private readonly appServices:IAppServices;

    private readonly tileId:number;

    private readonly queryMatches:Array<QueryMatch>;

    private readonly measureMap = {
        't': 'T-score',
        'm': 'MI',
        '3': 'MI3',
        'l': 'log likelihood',
        's': 'min. sensitivity',
        'd': 'logDice',
        'p': 'MI.log_f',
        'r': 'relative freq.'
    };

    constructor({
        dispatcher, tileId, appServices, service, initState,
        dependentTiles, queryMatches
    }:CollocModelArgs) {
        super(dispatcher, initState);
        this.tileId = tileId;
        this.appServices = appServices;
        this.collApi = service;
        this.queryMatches = queryMatches;

        this.addActionHandler(
            GlobalActions.SubqItemHighlighted,
            (state, action) => {
                state.selectedText = action.payload.text;
            }
        );
        this.addActionHandler(
            GlobalActions.SubqItemDehighlighted.name,
            (state, action) => {
                state.selectedText = null;
            }
        );
        this.addActionSubtypeHandler(
            GlobalActions.EnableTileTweakMode,
            action => action.payload.ident === this.tileId,
            (state, action) => {
                state.isTweakMode = true;
            }
        );
        this.addActionSubtypeHandler(
            GlobalActions.DisableTileTweakMode,
            action => action.payload.ident === this.tileId,
            (state, action) => {
                state.isTweakMode = false;
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
        this.addActionHandler(
            GlobalActions.RequestQueryResponse,
            (state, action) => {
                state.isBusy = true;
                state.error = null;
            },
            (state, action, seDispatch) => {
                this.reloadAllData(
                    state,
                    this.appServices.dataStreaming(),
                    rxOf(...List.map((qm, i) => tuple(i, qm),  this.queryMatches)),
                    seDispatch
                );
            }
        );


        this.addActionSubtypeHandler(
            Actions.TileDataLoaded,
            action => action.payload.tileId === this.tileId,
            (state, action) => {
                state.isBusy = false;
                if (action.error) {
                    console.error(action.error);
                    state.error = this.appServices.normalizeHttpApiError(action.error);
                }
            }
        );

        this.addActionSubtypeHandler(
            Actions.PartialTileDataLoaded,
            (action) => action.payload.tileId === this.tileId,
            (state, action) => {
                if (state.queryType === QueryType.SINGLE_QUERY && state.comparisonCorpname) {
                    state.data[action.payload.queryIdx] = action.payload.data;
                    state.data[action.payload.queryIdx+1] = List.map(
                        v => ({
                            str: v.word,
                            stats: [v.score],
                            freq: v.freq,
                            nfilter: [null, null],
                            pfilter: [null, null],
                            interactionId: null,
                        }),
                        action.payload.cmpData
                    );
                    state.heading = pipe(
                        [{label: 'Abs', ident: ''}],
                        List.concat(
                            pipe(
                                action.payload.heading,
                                List.map(
                                    (v, i) => this.measureMap[v.ident] ?
                                        {label: this.measureMap[v.ident], ident: v.ident} :
                                        null
                                ),
                                List.filter(v => v !== null)
                            )
                        )
                    );

                } else {
                    state.data[action.payload.queryIdx] = action.payload.data;
                    state.heading = pipe(
                        [{label: 'Abs', ident: ''}],
                        List.concat(
                            pipe(
                                action.payload.heading,
                                List.map(
                                    (v, i) => this.measureMap[v.ident] ?
                                        {label: this.measureMap[v.ident], ident: v.ident} :
                                        null
                                ),
                                List.filter(v => v !== null)
                            )
                        )
                    );
                }
                state.backlinks[action.payload.queryIdx] = this.collApi.getBacklink(action.payload.queryIdx);
            }
        );

        this.addActionSubtypeHandler(
            Actions.SetSrchContextType,
            action => action.payload.tileId === this.tileId,
            (state, action) => {
                state.isBusy = true;
                state.srchRangeType = action.payload.ctxType;
                state.backlinks = List.map(_ => null, this.queryMatches);
            },
            (state, action, seDispatch) => {
                const subg = appServices.dataStreaming().startNewSubgroup(this.tileId, ...dependentTiles);
                seDispatch(
                    GlobalActions.TileSubgroupReady,
                    {
                        mainTileId: this.tileId,
                        subgroupId: subg.getId()
                    }
                );
                this.reloadAllData(
                    state,
                    subg,
                    rxOf(...List.map((qm, i) => tuple(i, qm), this.queryMatches)),
                    seDispatch
                );
            }
        );

        this.addActionSubtypeHandler(
            GlobalActions.FollowBacklink,
            action => action.payload.tileId === this.tileId,
            null,
            (state, action, dispatch) => {
                this.collApi.requestBacklink(
                    this.stateToArgs(state, this.queryMatches[action.payload.backlink.queryId])
                ).subscribe({
                    next: url => {
                        dispatch(GlobalActions.BacklinkPreparationDone);
                        window.open(url.toString(),'_blank');
                    },
                    error: err => {
                        dispatch(GlobalActions.BacklinkPreparationDone, err);
                        this.appServices.showMessage(SystemMessageType.ERROR, err);
                    },
                });
            }
        );

        this.addActionSubtypeHandler(
            GlobalActions.GetSourceInfo,
            action => action.payload.tileId === this.tileId,
            (state, action) => {},
            (state, action, seDispatch) => {
                this.collApi.getSourceDescription(
                    appServices.dataStreaming().startNewSubgroup(this.tileId),
                    this.tileId,
                    this.appServices.getISO639UILang(),
                    state.corpname

                ).subscribe({
                    next: (data) => {
                        seDispatch({
                            name: GlobalActions.GetSourceInfoDone.name,
                            payload: {
                                data: data
                            }
                        });
                    },
                    error: (err) => {
                        console.error(err);
                        seDispatch({
                            name: GlobalActions.GetSourceInfoDone.name,
                            error: err

                        });
                    }
                });
            }
        );
    }

    private stateToArgs(state:CollocModelState, queryMatch:QueryMatch):MQueryCollArgs|null {
        if (testIsDictMatch(queryMatch)) {
            const [cfromw, ctow] = ctxToRange(state.srchRangeType, state.srchRange);
            return {
                corpusId: state.corpname,
                cmpCorp: state.comparisonCorpname || undefined,
                q: mkLemmaMatchQuery(queryMatch, state.posQueryGenerator),
                subcorpus: '', // TODO
                measure: this.measureMap[state.appliedMetrics[0]],
                srchLeft: Math.abs(cfromw),
                srchRight:  Math.abs(ctow),
                srchAttr: state.tokenAttr,
                minCollFreq: state.minAbsFreq, // TODO what about global vs local freq.?
                maxItems: state.citemsperpage,
                examplesPerColl: state.examplesPerColl,
            }
        }
        return null;
    }

    private reloadAllData(
        state:CollocModelState,
        streaming:IDataStreaming,
        reqArgs:Observable<FreqRequestArgs>,
        seDispatch:SEDispatcher,
    ):void {
        this.loadCollocations(state, reqArgs, streaming, seDispatch).subscribe({
            next: (isEmpty) => {
                seDispatch<typeof Actions.TileDataLoaded>({
                    name: Actions.TileDataLoaded.name,
                    payload: {
                        tileId: this.tileId,
                        isEmpty
                    }
                })
            },
            error: (err) => {
                this.appServices.showMessage(SystemMessageType.ERROR, err);
                seDispatch<typeof Actions.TileDataLoaded>({
                    name: Actions.TileDataLoaded.name,
                    payload: {
                        tileId: this.tileId,
                        isEmpty: true
                    },
                    error: err
                });
            }
        });
    }

    private loadCollocations(
        state:CollocModelState,
        freqReqs:Observable<FreqRequestArgs>,
        streaming:IDataStreaming,
        seDispatch:SEDispatcher
    ):Observable<boolean> {
        return freqReqs.pipe(
            mergeMap(
                ([queryId, queryMatch]) => this.appServices.callAPIWithExtraVal(
                    this.collApi,
                    streaming,
                    this.tileId,
                    queryId,
                    testIsDictMatch(queryMatch) ?
                        this.stateToArgs(state, queryMatch) :
                        null,
                    {queryId: queryId}
                )
            ),
            tap(
                ([data, args]) => {
                    seDispatch<typeof Actions.PartialTileDataLoaded>({
                        name: Actions.PartialTileDataLoaded.name,
                        payload: {
                            tileId: this.tileId,
                            heading: data.collHeadings,
                            data: data.data,
                            cmpData: data.cmpData || [],
                            queryIdx: args.queryId
                        }
                    });
                }
            ),
            reduce(
                (acc, [resp,]) => acc && resp.data.length === 0,
                true // the "isEmpty" flag
            )
        );
    }
}