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
import { map, concatMap, reduce, tap } from 'rxjs/operators';
import { of as rxOf } from 'rxjs';
import { StatelessModel, Action, SEDispatcher, IActionQueue } from 'kombo';

import { IAppServices } from '../../../appServices';
import { ActionName as GlobalActionName, Actions as GlobalActions, isTileSomeDataLoadedAction } from '../../../models/actions';
import { SubQueryItem, SubqueryPayload, RangeRelatedSubqueryValue, RecognizedQueries } from '../../../query/index';
import { ConcApi } from '../../../api/vendor/kontext/concordance/v015';
import { mkContextFilter, escapeVal  } from '../../../api/vendor/kontext/concordance/v015/common'
import { Line, ViewMode, ConcResponse } from '../../../api/abstract/concordance';
import { Observable } from 'rxjs';
import { isConcLoadedPayload } from '../concordance/actions';
import { CollExamplesLoadedPayload } from './actions';
import { Actions, ActionName } from './actions';
import { normalizeTypography } from '../../../models/tiles/concordance/normalize';
import { Dict, pipe, List, tuple } from 'cnc-tskit';
import { callWithExtraVal } from '../../../api/util';
import { TileWait } from '../../../models/tileSync';
import { AttrViewMode, FilterServerArgs, QuickFilterRequestArgs } from '../../../api/vendor/kontext/types';


export interface ConcFilterModelState {
    isBusy:boolean;
    isTweakMode:boolean;
    isMobile:boolean;
    widthFract:number;
    error:string;
    corpName:string;
    otherCorpname:string|null;
    posAttrs:Array<string>;
    attrVmode:AttrViewMode;
    viewMode:ViewMode;
    itemsPerSrc:number;
    lines:Array<Line>;
    concPersistenceIds:Array<string>;
    metadataAttrs:Array<{value:string; label:string}>;
    visibleMetadataLine:number;
}

type AllSubqueries = Array<SubQueryItem<RangeRelatedSubqueryValue>>;

interface SourceLoadingData {
    concordanceIds:Array<string>;
    subqueries:AllSubqueries;
}

interface SingleQueryFreqArgs {
    concId:string;
    queryId:number;
    subq:SubQueryItem<RangeRelatedSubqueryValue>;
}

export interface ConcFilterModelArgs {
    tileId:number;
    waitForTiles:Array<number>;
    waitForTilesTimeoutSecs:number;
    subqSourceTiles:Array<number>;
    dispatcher:IActionQueue;
    appServices:IAppServices;
    api:ConcApi;
    initState:ConcFilterModelState;
    queryMatches:RecognizedQueries;
}


export class ConcFilterModel extends StatelessModel<ConcFilterModelState, TileWait<boolean>> {

    private readonly api:ConcApi;

    private readonly appServices:IAppServices;

    private readonly tileId:number;

    private readonly waitForTiles:Array<number>;

    private readonly subqSourceTiles:Array<number>;

    private readonly queryMatches:RecognizedQueries;

    private readonly waitForTilesTimeoutSecs:number;

    constructor({dispatcher, tileId, waitForTiles, waitForTilesTimeoutSecs, subqSourceTiles, appServices, api, initState, queryMatches}:ConcFilterModelArgs) {
        super(dispatcher, initState);
        this.tileId = tileId;
        this.api = api;
        this.waitForTiles = [...waitForTiles];
        this.waitForTilesTimeoutSecs = waitForTilesTimeoutSecs;
        this.subqSourceTiles = [...subqSourceTiles];
        this.appServices = appServices;
        this.queryMatches = queryMatches;

        this.addActionHandler<GlobalActions.RequestQueryResponse>(
            GlobalActionName.RequestQueryResponse,
            (state, action)  => {
                state.isBusy = true;
                state.error = null;
                state.lines = [];
                state.concPersistenceIds = List.repeat(() => '', this.queryMatches.length);
            },
            (state, action, dispatch) => {
                this.handleDataLoad(state, false, dispatch);
            }
        );

        this.addActionHandler<GlobalActions.TilePartialDataLoaded<CollExamplesLoadedPayload>>(
            GlobalActionName.TilePartialDataLoaded,
            (state, action) => {
                if (action.payload.tileId === this.tileId) {
                    state.lines = state.lines.concat(action.payload.data);
                    state.concPersistenceIds[action.payload.queryId] = action.payload.baseConcId;
                }
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

        this.addActionHandler<GlobalActions.SubqItemHighlighted>(
            GlobalActionName.SubqItemHighlighted,
            (state, action) => {
                const srchIdx = state.lines.findIndex(v => v.interactionId === action.payload.interactionId);
                if (srchIdx > -1) {
                    const line = state.lines[srchIdx];
                    state.lines[srchIdx] = {
                        left: line.left,
                        kwic: line.kwic,
                        right: line.right,
                        align: line.align,
                        metadata: line.metadata || [],
                        toknum: line.toknum,
                        interactionId: line.interactionId,
                        isHighlighted: true
                    };
               }
            }
        );
        this.addActionHandler<GlobalActions.SubqItemDehighlighted>(
            GlobalActionName.SubqItemDehighlighted,
            (state, action) => {
                const srchIdx = state.lines.findIndex(v => v.interactionId === action.payload.interactionId);
                if (srchIdx > -1) {
                    const line = state.lines[srchIdx];
                    state.lines[srchIdx] = {
                        left: line.left,
                        kwic: line.kwic,
                        right: line.right,
                        align: line.align,
                        metadata: line.metadata || [],
                        toknum: line.toknum,
                        interactionId: line.interactionId,
                        isHighlighted: false
                    };
                }
            }
        );
        this.addActionHandler<GlobalActions.SubqChanged>(
            GlobalActionName.SubqChanged,
            (state, action) => {
                if (Dict.hasKey(action.payload.tileId.toFixed()), this.waitForTiles) {
                    state.isBusy = true;
                    state.lines = [];
                }
            },
            (state, action, dispatch) => {
                this.handleDataLoad(state, true, dispatch);
            }
        );
        this.addActionHandler<GlobalActions.TileAreaClicked>(
            GlobalActionName.TileAreaClicked,
            (state, action) => {
                if (action.payload.tileId === this.tileId) {
                    state.visibleMetadataLine = -1;
                }
            }
        );
        this.addActionHandler<Actions.ShowLineMetadata>(
            ActionName.ShowLineMetadata,
            (state, action) => {
                if (action.payload.tileId === this.tileId) {
                    state.visibleMetadataLine = action.payload.idx;
                }
            }
        );
        this.addActionHandler<Actions.HideLineMetadata>(
            ActionName.HideLineMetadata,
            (state, action) => {
                if (action.payload.tileId === this.tileId) {
                    state.visibleMetadataLine = -1;
                }
            }
        );
        this.addActionHandler<GlobalActions.GetSourceInfo>(
            GlobalActionName.GetSourceInfo,
            null,
            (state, action, dispatch) => {
                if (action.payload.tileId === this.tileId) {
                    this.api.getSourceDescription(this.tileId, this.appServices.getISO639UILang(), state.corpName)
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

    private mkConcArgs(state:ConcFilterModelState, subq:SubQueryItem<RangeRelatedSubqueryValue>, concId:string):FilterServerArgs|QuickFilterRequestArgs {
        if (state.otherCorpname) {
            return {
                corpname: state.corpName,
                usesubcorp: undefined, // TODO do we want this?
                maincorp: state.otherCorpname,
                pnfilter: 'p',
                filfl: 'f',
                filfpos: '-20',
                filtpos: '20',
                inclkwic: 1,
                qtype: 'advanced',
                query: `[lemma="${escapeVal(subq.value.value)}"]`, // TODO generalize attr?
                qmcase: false,
                within: true,
                default_attr: 'word',
                use_regexp: false,
                kwicleftctx: '-5',
                kwicrightctx: '5',
                pagesize: '10',
                fromp: '1',
                attr_vmode: 'visible-kwic',
                attrs: 'word',
                viewmode: 'align',
                format:'json',
                type: 'filterQueryArgs',
                q: '~' + concId
            }
        }

        return {
            type: 'quickFilterQueryArgs',
            corpname: state.corpName,
            maincorp: state.otherCorpname ? state.otherCorpname : undefined, // we need to filter using the 2nd language
            kwicleftctx: '-20',
            kwicrightctx: '20',
            pagesize: '5',
            fromp: '1', // TODO choose randomly stuff??
            attr_vmode: state.attrVmode,
            attrs: state.posAttrs.join(','),
            refs: state.metadataAttrs.map(v => '=' + v.value).join(','),
            viewmode: state.viewMode,
            q: '~' + concId,
            q2: mkContextFilter(subq.value.context, subq.value.value, subq),
            format: 'json',
        };
    }

    /**
     *
     * @param state
     * @param concId
     * @param query
     * @return Observable of tuple [base conc ID, queryId, filtered conc response]
     */
    private loadFilteredConcs(
        state:ConcFilterModelState,
        concId:string,
        queryId:number,
        query:SubQueryItem<RangeRelatedSubqueryValue>
    ):Observable<[string, number, ConcResponse]> {

        return rxOf(query).pipe(
            concatMap(
                subq => callWithExtraVal(
                    this.api,
                    this.mkConcArgs(state, subq, concId),
                    subq
                )
            ),
            map(
                ([v, subq]) => [
                    concId,
                    queryId,
                    {
                        concPersistenceID: v.concPersistenceID,
                        messages: v.messages,
                        lines: v.lines.map(line => ({
                            left: line.left,
                            kwic: line.kwic,
                            right: line.right,
                            align: line.align,
                            metadata: (line.metadata || []).map(item => ({
                                value: item.value,
                                label: (() => {
                                    const srch = state.metadataAttrs.find(v => v.value === item.label);
                                    return srch ? srch.label : item.label;
                                })()
                            })),
                            toknum: line.toknum,
                            interactionId: subq.interactionId
                        })),
                        concsize: v.concsize,
                        arf: v.arf,
                        ipm: v.ipm,
                        query: v.query,
                        corpName: v.corpName,
                        subcorpName: v.subcorpName,
                        align: state.otherCorpname, // TODO not always needed
                        maincorp: state.otherCorpname, // TODO not always needed
                    }
                ]
            )
        );
    }

    private isFromSubqSourceTile(action:Action):action is (Action<{tileId: number} & SubqueryPayload<RangeRelatedSubqueryValue>>) {
        return this.subqSourceTiles.find(v => v === action.payload['tileId'] && action.payload['subqueries']) !== undefined;
    }

    private handleDataLoad(state:ConcFilterModelState, ignoreConc:boolean, seDispatch:SEDispatcher) {
        this.suspendWithTimeout(
            this.waitForTilesTimeoutSecs * 1000,
            TileWait.create(this.waitForTiles, ()=>false),
            (action:Action<{tileId:number}>, syncData) => {
                if (isTileSomeDataLoadedAction(action) && syncData.tileIsRegistered(action.payload.tileId)) {
                    if (action.error) {
                        throw action.error;
                    }
                    if (action.name === GlobalActionName.TileDataLoaded) { // i.e. we don't sync via TilePartialDataLoaded
                        syncData.setTileDone(action.payload.tileId, true);

                    } else if (action.name === GlobalActionName.TilePartialDataLoaded) {
                        syncData.touch();
                    }

                    return this.isFromSubqSourceTile(action) && ignoreConc ? null : syncData.next(v => v === true);
                }
                return syncData;
            }

        ).pipe(
            reduce(
                (acc, action) => {
                    const ans = {...acc};
                    const payload = action.payload;
                    if (this.isFromSubqSourceTile(action)) {
                        ans.subqueries = List.concat(ans.subqueries, action.payload.subqueries);

                    } else if (isConcLoadedPayload(payload)) {
                        ans.concordanceIds = [...payload.concPersistenceIDs];
                    }
                    return ans;
                },
                {concordanceIds: state.concPersistenceIds, subqueries:[]} as SourceLoadingData
            ),
            concatMap(
                ({concordanceIds, subqueries}) => rxOf(...pipe(
                    concordanceIds,
                    List.flatMap(concId => List.map(sq => tuple(concId, sq), subqueries)),
                    List.map(([concId, subq], queryId) => tuple(concId, subq, queryId))
                ))
            ),
            concatMap(
                ([concId, subq, queryId]) => this.loadFilteredConcs(state, concId, queryId, subq)
            ),
            tap(
                ([baseConcId, queryId, resp]) => {
                    seDispatch<GlobalActions.TilePartialDataLoaded<CollExamplesLoadedPayload>>({
                        name: GlobalActionName.TilePartialDataLoaded,
                        payload: {
                            tileId: this.tileId,
                            queryId: queryId,
                            data: normalizeTypography(resp.lines.slice(0, state.itemsPerSrc)),
                            baseConcId: baseConcId
                        }
                    });
                }
            ),
            reduce(
                (acc, [,,resp]) => acc && resp.lines.length === 0,
                true // is empty
            )
        ).subscribe(
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
                console.error(err)
                seDispatch<GlobalActions.TileDataLoaded<{}>>({
                    name: GlobalActionName.TileDataLoaded,
                    payload: {
                        tileId: this.tileId,
                        isEmpty: true
                    },
                    error: err,
                });
            }
        );
    }
}