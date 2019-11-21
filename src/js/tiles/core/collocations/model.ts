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
import { Observable, Observer, of } from 'rxjs';
import { concatMap } from 'rxjs/operators';

import { AppServices } from '../../../appServices';
import { HTTPMethod, SystemMessageType } from '../../../common/types';
import { ActionName as GlobalActionName, Actions as GlobalActions } from '../../../models/actions';
import { ConcLoadedPayload } from '../concordance/actions';
import { ActionName, Actions, DataLoadedPayload } from './common';
import { Backlink, BacklinkWithArgs } from '../../../common/tile';
import { CollocationApi } from '../../../common/api/abstract/collocations';
import { CollocModelState, ctxToRange } from '../../../common/models/collocations';
import { CoreCollRequestArgs } from '../../../common/api/kontext/collocations';
import { findCurrLemmaVariant } from '../../../models/query';
import { LemmaVariant, RecognizedQueries, QueryType } from '../../../common/query';
import { CoreApiGroup } from '../../../common/api/coreGroups';
import { ConcApi, QuerySelector, mkMatchQuery } from '../../../common/api/kontext/concordance';
import { callWithExtraVal } from '../../../common/api/util';
import { ViewMode } from '../../../common/api/abstract/concordance';
import { createInitialLinesData } from '../../../common/models/concordance';


export interface CollocModelArgs {
    dispatcher:IActionQueue;
    tileId:number;
    appServices:AppServices;
    service:CollocationApi<{}>;
    concApi:ConcApi;
    initState:CollocModelState;
    waitForTile:number;
    lemmas:RecognizedQueries;
    backlink:Backlink;
    queryType:QueryType;
    apiType:CoreApiGroup;
}


export class CollocModel extends StatelessModel<CollocModelState> {


    private readonly service:CollocationApi<{}>;

    private readonly concApi:ConcApi;

    private readonly appServices:AppServices;

    private readonly tileId:number;

    private readonly waitForTile:number;

    private readonly lemmas:RecognizedQueries;

    private readonly queryType:QueryType;
    
    private readonly apiType:CoreApiGroup;
    
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

    constructor({dispatcher, tileId, waitForTile, appServices, service, initState, backlink, lemmas, queryType, apiType, concApi}:CollocModelArgs) {
        super(dispatcher, initState);
        this.tileId = tileId;
        this.waitForTile = waitForTile;
        this.appServices = appServices;
        this.service = service;
        this.concApi = concApi;
        this.backlink = backlink;
        this.lemmas = lemmas;
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
                if (this.queryType === QueryType.CMP_QUERY) {
                    this.reloadAllData(state, seDispatch);
                } else {
                    if (this.waitForTile) {
                        this.suspend(
                            (action:Action) => {
                                if (action.name === GlobalActionName.TileDataLoaded && action.payload['tileId'] === this.waitForTile) {
                                    const payload = (action as GlobalActions.TileDataLoaded<ConcLoadedPayload>).payload;
                                    if (action.error) {
                                        seDispatch<GlobalActions.TileDataLoaded<DataLoadedPayload>>({
                                            name: GlobalActionName.TileDataLoaded,
                                            payload: {
                                                tileId: this.tileId,
                                                isEmpty: true,
                                                data: [],
                                                heading: null,
                                                concId: null,
                                                queryId: null,
                                                subqueries: [],
                                                lang1: null,
                                                lang2: null
                                            },
                                            error: new Error(this.appServices.translate('global__failed_to_obtain_required_data')),
                                        });
                                        return true;
                                    }
                                    this.requestData(state, payload.concPersistenceID, action.error, seDispatch);
                                    return true;
                                }
                                return false;
                            }
                        );

                    } else {
                        const variant = findCurrLemmaVariant(this.lemmas[0]);
                        this.requestData(state, variant, null, seDispatch);
                    }
                }
            }
        );
        this.addActionHandler<GlobalActions.TileDataLoaded<DataLoadedPayload>>(
            GlobalActionName.TileDataLoaded,
            (state, action) => {
                if (action.payload.tileId === this.tileId) {
                    state.concId = action.payload.concId;
                    state.isBusy = false;
                    if (action.error) {
                        state.error = action.error.message;

                    } else {
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
                    this.requestData(state, state.concId, null, seDispatch);
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

    private createBackLink(state:CollocModelState, action:GlobalActions.TileDataLoaded<DataLoadedPayload>):BacklinkWithArgs<CoreCollRequestArgs> {
        const [cfromw, ctow] = ctxToRange(state.srchRangeType, state.srchRange);
        return this.backlink ?
            {
                url: this.backlink.url,
                method: this.backlink.method || HTTPMethod.GET,
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

    private requestData(state:CollocModelState, dataSpec:LemmaVariant|string, prevActionErr:Error|null, seDispatch:SEDispatcher):void {
        new Observable((observer:Observer<{}>) => {
            if (prevActionErr) {
                observer.error(prevActionErr);

            } else {
                observer.next(this.service.stateToArgs(state, dataSpec));
                observer.complete();
            }
        })
        .pipe(concatMap(args => this.service.call(args)))
        .subscribe(
            (data) => {
                seDispatch<GlobalActions.TileDataLoaded<DataLoadedPayload>>({
                    name: GlobalActionName.TileDataLoaded,
                    payload: {
                        tileId: this.tileId,
                        isEmpty: data.data.length === 0,
                        heading: data.collHeadings,
                        data: data.data,
                        concId: data.concId,
                        queryId: 0,
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
            },
            (err) => {
                this.appServices.showMessage(SystemMessageType.ERROR, err);
                seDispatch<GlobalActions.TileDataLoaded<DataLoadedPayload>>({
                    name: GlobalActionName.TileDataLoaded,
                    payload: {
                        tileId: this.tileId,
                        isEmpty: true,
                        heading: null,
                        data: [],
                        concId: null,
                        queryId: null,
                        subqueries: [],
                        lang1: null,
                        lang2: null
                    },
                    error: err
                });
            }
        );
    }

    private reloadAllData(state:CollocModelState, seDispatch:SEDispatcher):void {
        of(...this.lemmas.map((lemma, queryId) => ({lemma: findCurrLemmaVariant(lemma), queryId: queryId})))
        .pipe(
            concatMap(args =>
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
                            shuffle: false,
                            attr_vmode: 'mouseover',
                            viewMode: ViewMode.KWIC,
                            tileId: this.tileId,
                            attrs: ['word'],
                            metadataAttrs: [],
                            queries: [],
                            concordances: createInitialLinesData(this.lemmas.length),
                            posQueryGenerator: ['tag', 'ppTagset']
                        },
                        args.lemma,
                        args.queryId,
                        null
                    ),
                    {
                        corpName: state.corpname,
                        subcName: null,
                        concId: null,
                        queryId: args.queryId,
                        origQuery: mkMatchQuery(args.lemma, ['tag', 'ppTagset'])
                    }
                )
            ),
            concatMap(([resp, args]) => {
                args.concId = resp.concPersistenceID;
                return callWithExtraVal(
                    this.service,
                    this.service.stateToArgs(state, args.concId),
                    args
                )
            })
        )
        .subscribe(
            ([data, args]) => {
                seDispatch<GlobalActions.TileDataLoaded<DataLoadedPayload>>({
                    name: GlobalActionName.TileDataLoaded,
                    payload: {
                        tileId: this.tileId,
                        isEmpty: data.data.length === 0,
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
            },
            (err) => {
                this.appServices.showMessage(SystemMessageType.ERROR, err);
                seDispatch<GlobalActions.TileDataLoaded<DataLoadedPayload>>({
                    name: GlobalActionName.TileDataLoaded,
                    payload: {
                        tileId: this.tileId,
                        isEmpty: true,
                        heading: null,
                        data: [],
                        concId: null,
                        queryId: null,
                        subqueries: [],
                        lang1: null,
                        lang2: null
                    },
                    error: err
                });
            }
        );
    }
}