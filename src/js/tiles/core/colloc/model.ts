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
import { concatMap, tap, reduce } from 'rxjs/operators';
import { List, HTTP, pipe } from 'cnc-tskit';

import { IAppServices } from '../../../appServices.js';
import { isWebDelegateApi, SystemMessageType } from '../../../types.js';
import { Actions as GlobalActions } from '../../../models/actions.js';
import { Actions, CollocModelState, ctxToRange, KonTextCollArgs } from './common.js';
import { Backlink, BacklinkWithArgs, createAppBacklink } from '../../../page/tile.js';
import { QueryMatch, QueryType } from '../../../query/index.js';
import { callWithExtraVal } from '../../../api/util.js';
import { MQueryCollAPI, MQueryCollArgs } from '../../../tiles/core/colloc/api.js';
import { mkLemmaMatchQuery, mkMatchQuery } from '../../../api/vendor/mquery/common.js';


export interface CollocModelArgs {
    dispatcher:IActionQueue;
    tileId:number;
    appServices:IAppServices;
    service:MQueryCollAPI;
    initState:CollocModelState;
    waitForTile:number;
    waitForTilesTimeoutSecs:number;
    backlink:Backlink;
    queryType:QueryType;
}


type FreqRequestArgs = [number, QueryMatch, string];


export class CollocModel extends StatelessModel<CollocModelState> {


    private readonly collApi:MQueryCollAPI;

    private readonly appServices:IAppServices;

    private readonly tileId:number;

    private readonly queryType:QueryType;

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

    private readonly backlink:Backlink;

    constructor({
        dispatcher, tileId, appServices, service, initState, backlink, queryType}:CollocModelArgs) {
        super(dispatcher, initState);
        this.tileId = tileId;
        this.appServices = appServices;
        this.collApi = service;
        this.backlink = !backlink?.isAppUrl && isWebDelegateApi(this.collApi) ? this.collApi.getBackLink(backlink) : backlink;
        this.queryType = queryType;

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
                    rxOf(...List.map<string, FreqRequestArgs>((v, i) => [i, state.queryMatches[i], v], state.concIds)),
                    true,
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
                state.concIds[action.payload.queryId] = action.payload.concId;
                state.data[action.payload.queryId] = action.payload.data;
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
                if (this.backlink?.isAppUrl) {
                    state.backlinks = [createAppBacklink(this.backlink)];
                } else {
                    state.backlinks.push(this.createBackLink(state, action));
                }
            }
        );

        this.addActionSubtypeHandler(
            Actions.SetSrchContextType,
            action => action.payload.tileId === this.tileId,
            (state, action) => {
                state.isBusy = true;
                state.srchRangeType = action.payload.ctxType;
                state.backlinks = [];
            },
            (state, action, seDispatch) => {
                this.reloadAllData(
                    state,
                    rxOf(...List.map<string, FreqRequestArgs>((v, i) => [i, state.queryMatches[i], v], state.concIds)),
                    false,
                    seDispatch
                );
            }
        );
        this.addActionSubtypeHandler(
            GlobalActions.GetSourceInfo,
            action => action.payload.tileId === this.tileId,
            (state, action) => {},
            (state, action, seDispatch) => {
                this.collApi.getSourceDescription(this.tileId, false, this.appServices.getISO639UILang(), state.corpname)
                .subscribe({
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

    private stateToArgs(state:CollocModelState, queryMatch:QueryMatch, queryId:string):MQueryCollArgs|null {
        if (queryMatch.lemma) {
            const [cfromw, ctow] = ctxToRange(state.srchRangeType, state.srchRange);
            return {
                corpusId: state.corpname,
                q: mkLemmaMatchQuery(queryMatch, state.posQueryGenerator),
                subcorpus: '', // TODO
                measure: this.measureMap[state.appliedMetrics[0]],
                srchLeft: Math.abs(cfromw),
                srchRight:  Math.abs(ctow),
                srchAttr: state.tokenAttr,
                minCollFreq: state.minAbsFreq, // TODO what about global vs local freq.?
                maxItems: state.citemsperpage
            }
        }
        return null;
    }

    private createBackLink(
        state:CollocModelState,
        action:typeof Actions.PartialTileDataLoaded
    ):BacklinkWithArgs<KonTextCollArgs> {

        const [cfromw, ctow] = ctxToRange(state.srchRangeType, state.srchRange);
        return this.backlink ?
            {
                url: this.backlink.url,
                method: this.backlink.method || HTTP.Method.GET,
                label: this.backlink.label,
                args: {
                    corpname: state.corpname,
                    q: `~${action.payload.concId}`,
                    cattr: state.tokenAttr,
                    cfromw: cfromw,
                    ctow: ctow,
                    cminfreq: state.minAbsFreq,
                    cminbgr: state.minLocalAbsFreq,
                    cbgrfns: state.appliedMetrics,
                    csortfn: state.sortByMetric,
                    citemsperpage: state.citemsperpage
                }
            } :
            null;
    }

    private reloadAllData(
        state:CollocModelState,
        reqArgs:Observable<FreqRequestArgs>,
        multicastRequest:boolean,
        seDispatch:SEDispatcher,
    ):void {
        this.loadCollocations(state, reqArgs, multicastRequest, seDispatch).subscribe({
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
        multicastRequest:boolean,
        seDispatch:SEDispatcher
):Observable<boolean> {
        return freqReqs.pipe(
            concatMap(([queryId, queryMatch, concId]) => {
                return callWithExtraVal(
                    this.collApi,
                    this.tileId,
                    multicastRequest,
                    this.stateToArgs(state, queryMatch, concId),
                    {queryId: queryId}
                )
            }),
            tap(
                ([data, args]) => {
                    seDispatch<typeof Actions.PartialTileDataLoaded>({
                        name: Actions.PartialTileDataLoaded.name,
                        payload: {
                            tileId: this.tileId,
                            heading: data.collHeadings,
                            data: data.data,
                            concId: data.concId,
                            queryId: args.queryId,
                            subqueries: data.data.map(v => ({
                                value: {
                                    value: v.str,
                                    context: ctxToRange(state.srchRangeType, state.srchRange)
                                },
                                interactionId: v.interactionId
                            })),
                            domain1: null,
                            domain2: null
                        }
                    });
                }
            ),
            reduce(
                (acc, [resp,]) => acc && resp.data.length === 0,
                true // is empty
            )
        );
    }
}