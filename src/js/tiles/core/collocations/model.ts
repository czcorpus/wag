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
import { Action, SEDispatcher, StatelessModel, IActionQueue } from 'kombo';
import { Observable, of as rxOf } from 'rxjs';
import { concatMap, map, tap, reduce, timeout } from 'rxjs/operators';
import { List, HTTP } from 'cnc-tskit';

import { IAppServices } from '../../../appServices';
import { SystemMessageType } from '../../../common/types';
import { ActionName as GlobalActionName, Actions as GlobalActions } from '../../../models/actions';
import { ConcLoadedPayload } from '../concordance/actions';
import { ActionName, Actions, DataLoadedPayload } from './common';
import { Backlink, BacklinkWithArgs } from '../../../common/tile';
import { CollocationApi } from '../../../common/api/abstract/collocations';
import { CollocModelState, ctxToRange } from '../../../common/models/collocations';
import { CoreCollRequestArgs } from '../../../common/api/kontext/collocations';
import { QueryMatch, QueryType } from '../../../common/query';
import { QuerySelector, RequestArgs } from '../../../common/api/kontext/concordance';
import { callWithExtraVal } from '../../../common/api/util';
import { ViewMode, ConcResponse, IConcordanceApi } from '../../../common/api/abstract/concordance';
import { createInitialLinesData } from '../../../common/models/concordance';


export interface CollocModelArgs {
    dispatcher:IActionQueue;
    tileId:number;
    appServices:IAppServices;
    service:CollocationApi<{}>;
    concApi:IConcordanceApi<{}>;
    initState:CollocModelState;
    waitForTile:number;
    waitForTilesTimeoutSecs:number;
    backlink:Backlink;
    queryType:QueryType;
    apiType:string;
}


type FreqRequestArgs = [number, QueryMatch, string];


export class CollocModel extends StatelessModel<CollocModelState> {


    private readonly service:CollocationApi<{}>;

    private readonly concApi:IConcordanceApi<{}>;

    private readonly appServices:IAppServices;

    private readonly tileId:number;

    private readonly waitForTile:number;

    private readonly waitForTilesTimeoutSecs:number;

    private readonly queryType:QueryType;

    private readonly apiType:string;

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

    constructor({dispatcher, tileId, waitForTile, waitForTilesTimeoutSecs, appServices, service, initState, backlink, queryType, apiType, concApi}:CollocModelArgs) {
        super(dispatcher, initState);
        this.tileId = tileId;
        this.waitForTile = waitForTile;
        this.waitForTilesTimeoutSecs = waitForTilesTimeoutSecs;
        this.appServices = appServices;
        this.service = service;
        this.concApi = concApi;
        this.backlink = backlink;
        this.queryType = queryType;
        this.apiType = apiType;

        this.addActionHandler<GlobalActions.SubqItemHighlighted>(
            GlobalActionName.SubqItemHighlighted,
            (state, action) => {
                state.selectedText = action.payload.text;
            }
        );
        this.addActionHandler<GlobalActions.SubqItemDehighlighted>(
            GlobalActionName.SubqItemDehighlighted,
            (state, action) => {
                state.selectedText = null;
            }
        );
        this.addActionHandler<GlobalActions.EnableTileTweakMode>(
            GlobalActionName.EnableTileTweakMode,
            (state, action) => {
                if (action.payload.ident === this.tileId) {
                    state.isTweakMode = true;
                }
            }
        );
        this.addActionHandler<GlobalActions.DisableTileTweakMode>(
            GlobalActionName.DisableTileTweakMode,
            (state, action) => {
                if (action.payload.ident === this.tileId) {
                    state.isTweakMode = false;
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
        this.addActionHandler<GlobalActions.RequestQueryResponse>(
            GlobalActionName.RequestQueryResponse,
            (state, action) => {
                state.isBusy = true;
                state.error = null;
            },
            (state, action, seDispatch) => {
                const conc$ = this.waitForTile ?
                    this.suspend({}, (action:Action, syncData) => {
                        if (action.name === GlobalActionName.TileDataLoaded && action.payload['tileId'] === this.waitForTile) {
                            return null;
                        }
                        return syncData;

                    }).pipe(
                        timeout(this.waitForTilesTimeoutSecs * 1000),
                        concatMap(action => {
                            const payload = action.payload as ConcLoadedPayload;
                            return rxOf(...List.map<string, FreqRequestArgs>((v, i) => [i, state.queryMatches[i], v], payload.concPersistenceIDs))
                        })
                    ) : this.loadConcs(state);
                this.reloadAllData(state, conc$, seDispatch);
            }
        );


        this.addActionHandler<GlobalActions.TileDataLoaded<{}>>(
            GlobalActionName.TileDataLoaded,
            (state, action) => {
                if (action.payload.tileId === this.tileId) {
                    state.isBusy = false;
                    if (action.error) {
                        state.error = action.error.message;
                    }
                }
            }
        );

        this.addActionHandler<GlobalActions.TilePartialDataLoaded<DataLoadedPayload>>(
            GlobalActionName.TilePartialDataLoaded,
            (state, action) => {
                if (action.payload.tileId === this.tileId) {
                    state.concIds[action.payload.queryId] = action.payload.concId;
                    state.data[action.payload.queryId] = action.payload.data;
                    state.heading =
                        [{label: 'Abs', ident: ''}]
                        .concat(
                            action.payload.heading
                                .map((v, i) => this.measureMap[v.ident] ? {label: this.measureMap[v.ident], ident: v.ident} : null)
                                .filter(v => v !== null)
                        );

                    state.backlink = this.createBackLink(state, action);
                }
            }
        );
        this.addActionHandler<Actions.SetSrchContextType>(
            ActionName.SetSrchContextType,
            (state, action) => {
                if (action.payload.tileId === this.tileId) {
                    state.isBusy = true;
                    state.srchRangeType = action.payload.ctxType;
                }
            },
            (state, action, seDispatch) => {
                if (action.payload.tileId === this.tileId) {
                    this.reloadAllData(
                        state,
                        rxOf(...List.map<string, FreqRequestArgs>((v, i) => [i, state.queryMatches[i], v], state.concIds)),
                        seDispatch
                    );
                }
            }
        );
        this.addActionHandler<GlobalActions.GetSourceInfo>(
            GlobalActionName.GetSourceInfo,
            (state, action) => {},
            (state, action, seDispatch) => {
                if (action.payload.tileId === this.tileId) {
                    this.service.getSourceDescription(this.tileId, this.appServices.getISO639UILang(), state.corpname)
                    .subscribe(
                        (data) => {
                            seDispatch({
                                name: GlobalActionName.GetSourceInfoDone,
                                payload: {
                                    data: data
                                }
                            });
                        },
                        (err) => {
                            console.error(err);
                            seDispatch({
                                name: GlobalActionName.GetSourceInfoDone,
                                error: err

                            });
                        }
                    );
                }
            }
        );
    }

    private createBackLink(state:CollocModelState, action:GlobalActions.TilePartialDataLoaded<DataLoadedPayload>):BacklinkWithArgs<CoreCollRequestArgs> {
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



    private loadConcs(state:CollocModelState):Observable<FreqRequestArgs> {
        return rxOf(...List.map((v, i) => [i, v] as [number, QueryMatch], state.queryMatches)).pipe(
            concatMap(([queryId, lemma]) =>
                callWithExtraVal<{}, ConcResponse, [number, QueryMatch]>(
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
                            shuffle: false,
                            attr_vmode: 'mouseover',
                            viewMode: ViewMode.KWIC,
                            tileId: this.tileId,
                            attrs: [],
                            metadataAttrs: [],
                            queries: [],
                            concordances: createInitialLinesData(state.queryMatches.length),
                            posQueryGenerator: state.posQueryGenerator
                        },
                        lemma,
                        queryId,
                        null
                    ),
                    [queryId, lemma]
                )
            ),
            map(([resp, [idx, lemma]]) => [idx, lemma, resp.concPersistenceID])
        );
    }


    private reloadAllData(state:CollocModelState, reqArgs:Observable<FreqRequestArgs>, seDispatch:SEDispatcher):void {
        this.loadCollocations(state, reqArgs, seDispatch).subscribe(
            (isEmpty) => {
                seDispatch<GlobalActions.TileDataLoaded<{}>>({
                    name: GlobalActionName.TileDataLoaded,
                    payload: {
                        tileId: this.tileId,
                        isEmpty: isEmpty
                    }
                })
            },
            (err) => {
                this.appServices.showMessage(SystemMessageType.ERROR, err);
                seDispatch<GlobalActions.TileDataLoaded<{}>>({
                    name: GlobalActionName.TileDataLoaded,
                    payload: {
                        tileId: this.tileId,
                        isEmpty: true
                    },
                    error: err
                });
            }
        );
    }

    private loadCollocations(state:CollocModelState, concIds:Observable<FreqRequestArgs>, seDispatch:SEDispatcher):Observable<boolean> {
        return concIds.pipe(
            concatMap(([queryId,, concId]) => {
                return callWithExtraVal(
                    this.service,
                    this.service.stateToArgs(state, concId),
                    {queryId: queryId}
                )
            }),
            tap(
                ([data, args]) => {
                    seDispatch<GlobalActions.TilePartialDataLoaded<DataLoadedPayload>>({
                        name: GlobalActionName.TilePartialDataLoaded,
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
                            lang1: null,
                            lang2: null
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