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
import { map, concatMap, reduce, tap, scan } from 'rxjs/operators';
import { of as rxOf } from 'rxjs';
import { StatelessModel, Action, SEDispatcher, IActionQueue } from 'kombo';

import { IAppServices } from '../../../appServices.js';
import { Actions as GlobalActions, isTileSomeDataLoadedAction } from '../../../models/actions.js';
import { SubQueryItem, SubqueryPayload, RangeRelatedSubqueryValue, RecognizedQueries } from '../../../query/index.js';
import { ConcApi } from '../../../api/vendor/kontext/concordance/v015/index.js';
import { mkContextFilter, escapeVal  } from '../../../api/vendor/kontext/concordance/v015/common.js'
import { Line, ViewMode, ConcResponse } from '../../../api/abstract/concordance.js';
import { Observable } from 'rxjs';
import { isConcLoadedPayload } from '../concordance/actions.js';
import { Actions } from './actions.js';
import { normalizeTypography } from '../../../models/tiles/concordance/normalize.js';
import { Dict, pipe, List, tuple } from 'cnc-tskit';
import { callWithExtraVal } from '../../../api/util.js';
import { TileWait } from '../../../models/tileSync.js';
import { AttrViewMode, FilterServerArgs, QuickFilterRequestArgs } from '../../../api/vendor/kontext/types.js';
import { isWebDelegateApi, SystemMessageType } from '../../../types.js';
import { Backlink, BacklinkWithArgs, createAppBacklink } from '../../../page/tile.js';


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
    concPersistenceId:string;
    metadataAttrs:Array<{value:string; label:string}>;
    visibleMetadataLine:number;
    backlink:BacklinkWithArgs<{}>;
}

type AllSubqueries = Array<SubQueryItem<RangeRelatedSubqueryValue>>;

interface SourceLoadingData {
    concordanceId:string;
    subqueries:AllSubqueries;
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
    backlink:Backlink;
}


export class ConcFilterModel extends StatelessModel<ConcFilterModelState> {

    private readonly api:ConcApi;

    private readonly appServices:IAppServices;

    private readonly tileId:number;

    private readonly waitForTiles:Array<number>;

    private readonly subqSourceTiles:Array<number>;

    private readonly queryMatches:RecognizedQueries;

    private readonly waitForTilesTimeoutSecs:number;

    private readonly backlink:Backlink;


    constructor({
        dispatcher,
        tileId,
        waitForTiles,
        waitForTilesTimeoutSecs,
        subqSourceTiles,
        appServices,
        api,
        initState,
        queryMatches,
        backlink,
    }:ConcFilterModelArgs) {

        super(dispatcher, initState);
        this.tileId = tileId;
        this.api = api;
        this.waitForTiles = [...waitForTiles];
        this.waitForTilesTimeoutSecs = waitForTilesTimeoutSecs;
        this.subqSourceTiles = [...subqSourceTiles];
        this.appServices = appServices;
        this.queryMatches = queryMatches;
        this.backlink = !backlink?.isAppUrl && isWebDelegateApi(this.api) ? this.api.getBackLink(backlink) : backlink;

        this.addActionHandler(
            GlobalActions.RequestQueryResponse,
            (state, action)  => {
                state.isBusy = true;
                state.error = null;
                state.lines = [];
                state.concPersistenceId = null;
            },
            (state, action, dispatch) => {
                this.handleDataLoad(state, false, dispatch);
            }
        );

        this.addActionHandler(
            Actions.PartialTileDataLoaded,
            (state, action) => {
                if (action.payload.tileId === this.tileId) {
                    state.lines = state.lines.concat(action.payload.data);
                    state.concPersistenceId = action.payload.baseConcId;
                }
            }
        );

        this.addActionHandler(
            Actions.TileDataLoaded,
            (state, action) => {
                if (action.payload.tileId === this.tileId) {
                    state.isBusy = false;
                    if (action.error) {
                        state.error = this.appServices.normalizeHttpApiError(action.error);
                    }
                    state.backlink = this.backlink?.isAppUrl ? createAppBacklink(this.backlink) : null
                }
            }
        );

        this.addActionHandler(
            GlobalActions.SubqItemHighlighted,
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
        this.addActionHandler(
            GlobalActions.SubqItemDehighlighted,
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
        this.addActionHandler(
            GlobalActions.SubqChanged,
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
        this.addActionHandler(
            GlobalActions.TileAreaClicked,
            (state, action) => {
                if (action.payload.tileId === this.tileId) {
                    state.visibleMetadataLine = -1;
                }
            }
        );
        this.addActionHandler(
            Actions.ShowLineMetadata,
            (state, action) => {
                if (action.payload.tileId === this.tileId) {
                    state.visibleMetadataLine = action.payload.idx;
                }
            }
        );
        this.addActionHandler(
            Actions.HideLineMetadata,
            (state, action) => {
                if (action.payload.tileId === this.tileId) {
                    state.visibleMetadataLine = -1;
                }
            }
        );
        this.addActionHandler(
            GlobalActions.GetSourceInfo,
            null,
            (state, action, dispatch) => {
                if (action.payload.tileId === this.tileId) {
                    this.api.getSourceDescription(
                        this.tileId, false, this.appServices.getISO639UILang(), state.corpName)
                    .subscribe({
                        next: (data) => {
                            dispatch({
                                name: GlobalActions.GetSourceInfoDone.name,
                                payload: {
                                    data: data
                                }
                            });
                        },
                        error: (err) => {
                            console.error(err);
                            dispatch({
                                name: GlobalActions.GetSourceInfoDone.name,
                                error: err

                            });
                        }
                    });
                }
            }
        );
    }

    private mkConcArgs(
        state:ConcFilterModelState,
        subq:SubQueryItem<RangeRelatedSubqueryValue>,
        concId:string
    ):FilterServerArgs|QuickFilterRequestArgs {

        // translation mode -> appending additional filter for the aligned language
        // (here 'otherCorpname')
        if (state.otherCorpname) {
            return {
                type: 'filterQueryArgs',
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
                kwicleftctx: '-20',
                kwicrightctx: '20',
                pagesize: '10',
                fromp: '1',
                attr_vmode: 'visible-kwic',
                attrs: 'word',
                viewmode: 'align',
                format:'json',
                q: '~' + concId
            }
        }
        // for single-search mode we use the 'quick_filter' function
        return {
            type: 'quickFilterQueryArgs',
            corpname: state.corpName,
            kwicleftctx: '-20',
            kwicrightctx: '20',
            pagesize: '5',
            fromp: '1', // TODO choose random stuff??
            attr_vmode: state.attrVmode,
            attrs: state.posAttrs.join(','),
            refs: List.map(v => '=' + v.value, state.metadataAttrs).join(','),
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
                    this.tileId,
                    false,
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
        this.waitForActionWithTimeout(
            this.waitForTilesTimeoutSecs * 1000,
            TileWait.create(this.waitForTiles, ()=>false),
            (action:Action<{tileId:number}>, syncData) => {
                if (isTileSomeDataLoadedAction(action) && syncData.tileIsRegistered(action.payload.tileId)) {
                    if (action.error) {
                        throw action.error;
                    }
                    if (action.name === Actions.TileDataLoaded.name) { // i.e. we don't sync via TilePartialDataLoaded
                        syncData.setTileDone(action.payload.tileId, true);

                    } else if (action.name === Actions.PartialTileDataLoaded.name) {
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
                        ans.concordanceId = List.head(payload.concPersistenceIDs); // we do not support cmp query
                    }
                    return ans;
                },
                {concordanceId: state.concPersistenceId, subqueries:[]} as SourceLoadingData
            ),
            concatMap(
                ({concordanceId, subqueries}) => rxOf(...pipe(
                    subqueries,
                    List.map((subq, queryId) => tuple(concordanceId, subq, queryId))
                ))
            ),
            concatMap(
                ([concId, subq, queryId]) => this.loadFilteredConcs(state, concId, queryId, subq)
            ),
            // select only unique concordance lines
            scan(
                ([used,,,], [baseConcId, queryId, resp]) => {
                    let lines: Array<Line>;
                    if (used.size === 0) {
                        lines = resp.lines.slice(0, state.itemsPerSrc);

                    } else {
                        lines = List.filter(v => !used.has(v.toknum), resp.lines).slice(0, state.itemsPerSrc);
                        if (lines.length < state.itemsPerSrc) {
                            lines.concat(List.filter(v => used.has(v.toknum), resp.lines).slice(0, state.itemsPerSrc - lines.length))
                        }
                    }
                    lines.forEach(line => {
                        used = used.add(line.toknum)
                    });
                    return tuple(used, baseConcId, queryId, lines);
                },
                tuple(new Set<number>(), undefined, undefined, undefined)
            ),
            tap(
                ([_, baseConcId, queryId, lines]) => {
                    seDispatch<typeof Actions.PartialTileDataLoaded>({
                        name: Actions.PartialTileDataLoaded.name,
                        payload: {
                            tileId: this.tileId,
                            queryId: queryId,
                            data: normalizeTypography(lines),
                            baseConcId: baseConcId
                        }
                    });
                }
            ),
            reduce(
                (acc, [,,,lines]) => acc && lines.length === 0,
                true // is empty
            )
        ).subscribe({
            next: (isEmpty) => {
                seDispatch<typeof Actions.TileDataLoaded>({
                    name: GlobalActions.TileDataLoaded.name,
                    payload: {
                        tileId: this.tileId,
                        isEmpty: isEmpty
                    }
                })
            },
            error: (error) => {
                console.error(error);
                this.appServices.showMessage(SystemMessageType.ERROR,
                        this.appServices.humanizeHttpApiError(error));
                seDispatch<typeof Actions.TileDataLoaded>({
                    name: GlobalActions.TileDataLoaded.name,
                    payload: {
                        tileId: this.tileId,
                        isEmpty: true
                    },
                    error,
                });
            }
        });
    }
}