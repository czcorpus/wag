/*
 * Copyright 2018 Tomas Machalek <tomas.machalek@gmail.com>
 * Copyright 2018 Institute of the Czech National Corpus,
 *                Faculty of Arts, Charles University
 *
 * .pipe()

 Licensed under the Apache License, Version 2.0 (the "License");
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
import { Observable } from 'rxjs';
import { mergeMap, tap, reduce } from 'rxjs/operators';
import { HTTP, List, pipe } from 'cnc-tskit';

import { IAppServices } from '../../../appServices.js';
import { IConcordanceApi } from '../../../api/abstract/concordance.js';
import { ConcordanceMinState, createInitialLinesData } from '../../../models/tiles/concordance/index.js';
import { isWebDelegateApi, SystemMessageType } from '../../../types.js';
import { isSubqueryPayload, RecognizedQueries, QueryType } from '../../../query/index.js';
import { Backlink, BacklinkWithArgs, createAppBacklink } from '../../../page/tile.js';
import { Actions as GlobalActions } from '../../../models/actions.js';
import { findCurrQueryMatch } from '../../../models/query.js';
import { importMessageType } from '../../../page/notifications.js';
import { Actions } from './actions.js';
import { normalizeTypography } from '../../../models/tiles/concordance/normalize.js';
import { isCollocSubqueryPayload } from '../../../api/abstract/collocations.js';
import { callWithExtraVal } from '../../../api/util.js';



export interface BacklinkArgs {
    corpname:string;
    usesubcorp:string;
    q:string;
}

export interface ConcordanceTileState extends ConcordanceMinState {
    visibleQueryIdx:number;
    isBusy:boolean;
    error:string|null;
    isTweakMode:boolean;
    isMobile:boolean;
    widthFract:number;
    initialKwicLeftCtx:number;
    initialKwicRightCtx:number;
    backlinks:Array<BacklinkWithArgs<{}>>;
    disableViewModes:boolean;
    visibleMetadataLine:number;
}


export interface ConcordanceTileModelArgs {
    dispatcher:IActionQueue;
    tileId:number;
    waitForTile:number;
    waitForTilesTimeoutSecs:number;
    appServices:IAppServices;
    service:IConcordanceApi<{}>;
    queryMatches:RecognizedQueries;
    initState:ConcordanceTileState;
    queryType:QueryType;
    backlink:Backlink;
}


export class ConcordanceTileModel extends StatelessModel<ConcordanceTileState> {

    private readonly concApi:IConcordanceApi<{}>;

    private readonly queryMatches:RecognizedQueries;

    private readonly appServices:IAppServices;

    private readonly tileId:number;

    private readonly backlink:Backlink;

    private readonly waitForTile:number;

    private readonly queryType:QueryType;

    private readonly waitForTilesTimeoutSecs:number;

    public static readonly CTX_SIZES = [3, 3, 8, 12];

    constructor({dispatcher, tileId, appServices, service, queryMatches, initState, waitForTile,
            waitForTilesTimeoutSecs, backlink, queryType}:ConcordanceTileModelArgs) {
        super(dispatcher, initState);
        this.concApi = service;
        this.queryMatches = queryMatches;
        this.appServices = appServices;
        this.tileId = tileId;
        this.backlink = !backlink?.isAppUrl && isWebDelegateApi(this.concApi) ? this.concApi.getBackLink(backlink) : backlink;
        this.waitForTile = waitForTile;
        this.waitForTilesTimeoutSecs = waitForTilesTimeoutSecs;
        this.queryType = queryType;

        this.addActionHandler<typeof GlobalActions.SetScreenMode>(
            GlobalActions.SetScreenMode.name,
            (state, action) => {
                if (action.payload.isMobile !== state.isMobile) {
                    state.isMobile = action.payload.isMobile;
                    if (action.payload.isMobile) {
                        state.kwicLeftCtx = ConcordanceTileModel.CTX_SIZES[0];
                        state.kwicRightCtx = ConcordanceTileModel.CTX_SIZES[0];

                    } else {
                        state.kwicLeftCtx = state.initialKwicLeftCtx;
                        state.kwicRightCtx = state.initialKwicRightCtx;
                    }
                }
            },
            (state, action, dispatch) => {
                if (state.concordances.some(conc => conc.lines.length > 0)) {
                    this.reloadData(state, dispatch, null);
                }
            }
        );

        this.addActionHandler<typeof GlobalActions.EnableTileTweakMode>(
            GlobalActions.EnableTileTweakMode.name,
            (state, action) => {
                if (action.payload.ident === this.tileId) {
                    state.isTweakMode = true;
                }
            }
        );

        this.addActionHandler<typeof GlobalActions.DisableTileTweakMode>(
            GlobalActions.DisableTileTweakMode.name,
            (state, action) => {
                if (action.payload.ident === this.tileId) {
                    state.isTweakMode = false;
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
                if (this.waitForTile >= 0) {
                    this.waitForActionWithTimeout(
                        this.waitForTilesTimeoutSecs,
                        {},
                        (action, syncData) => {
                            if (GlobalActions.isTileDataLoaded(action) &&
                                        action.payload.tileId === this.waitForTile) {
                                if (isCollocSubqueryPayload(action.payload)) {
                                    // TODO escape (not a security issue)
                                    const cql = `[word="${action.payload.subqueries.map(v => v.value.value).join('|')}"]`;
                                    this.reloadData(state, dispatch, cql);

                                } else if (isSubqueryPayload(action.payload)) {
                                    // TODO escape (not a security issue)
                                    const cql = `[word="${action.payload.subqueries.map(v => v.value).join('|')}"]`;
                                    this.reloadData(state, dispatch, cql);
                                }
                                return null;
                            }
                            return syncData;
                        }
                    );
                } else {
                    this.reloadData(state, dispatch, null);
                }
            }
        );

        this.addActionHandler<typeof Actions.PartialTileDataLoaded>(
            Actions.PartialTileDataLoaded.name,
            (state, action) => {
                // note: error is handled via TileDataLoaded
                if (action.payload.tileId === this.tileId && !action.error) {
                    action.payload.data.messages.forEach(msg => console.info(`${importMessageType(msg[0]).toUpperCase()}: conc - ${msg[1]}`));
                    state.concordances[action.payload.queryId] = {
                        concsize: action.payload.data.concsize,
                        resultARF: action.payload.data.arf,
                        resultIPM: action.payload.data.ipm,
                        currPage: state.concordances[action.payload.queryId].loadPage,
                        loadPage: state.concordances[action.payload.queryId].loadPage,
                        numPages: Math.ceil(action.payload.data.concsize / state.pageSize),
                        concId: action.payload.data.concPersistenceID,
                        lines: normalizeTypography(action.payload.data.lines)
                    };
                }
            }
        );

        this.addActionHandler<typeof Actions.TileDataLoaded>(
            GlobalActions.TileDataLoaded.name,
            (state, action) => {
                if (action.payload.tileId === this.tileId) {
                    state.isBusy = false;
                    if (action.error) {
                        state.concordances = createInitialLinesData(this.queryMatches.length);
                        state.error = this.appServices.normalizeHttpApiError(action.error);
                        state.backlinks = [];
                    } else {
                        if (this.backlink?.isAppUrl) {
                            state.backlinks = [createAppBacklink(this.backlink)];
                        } else {
                            state.backlinks = List.map(v => this.createBackLink(state, v), action.payload.concPersistenceIDs);
                        }
                    }
                }
            }
        );

        this.addActionHandler<typeof Actions.LoadNextPage>(
            Actions.LoadNextPage.name,
            (state, action) => {
                if (action.payload.tileId === this.tileId) {
                    state.isBusy = true;
                    state.error = null;
                    state.concordances[state.visibleQueryIdx].loadPage = state.concordances[state.visibleQueryIdx].currPage + 1;
                }
            },
            (state, action, dispatch) => {
                if (action.payload['tileId'] === this.tileId) {
                    this.reloadData(state, dispatch, null);
                }
            }
        ).sideEffectAlsoOn(
            Actions.LoadPrevPage.name,
            Actions.SetViewMode.name
        );

        this.addActionHandler<typeof Actions.LoadPrevPage>(
            Actions.LoadPrevPage.name,
            (state, action) => {
                if (action.payload.tileId === this.tileId) {
                    if (state.concordances[state.visibleQueryIdx].currPage - 1 > 0) {
                        state.isBusy = true;
                        state.error = null;
                        state.concordances[state.visibleQueryIdx].loadPage = state.concordances[state.visibleQueryIdx].currPage - 1;

                    } else {
                        this.appServices.showMessage(SystemMessageType.ERROR, 'Cannot load page < 1');
                    }
                }
            }
        );

        this.addActionHandler<typeof Actions.SetViewMode>(
            Actions.SetViewMode.name,
            (state, action) => {
                if (action.payload.tileId === this.tileId) {
                    state.isBusy = true;
                    state.error = null;
                    state.viewMode = action.payload.mode;
                }
            }
        );

        this.addActionHandler<typeof GlobalActions.GetSourceInfo>(
            GlobalActions.GetSourceInfo.name,
            null,
            (state, action, dispatch) => {
                if (action.payload.tileId === this.tileId) {
                    this.concApi.getSourceDescription(this.tileId, this.appServices.getISO639UILang(), state.corpname)
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
                                    tileId: this.tileId,
                                }
                            });
                        }
                    });
                }
            }
        );

        this.addActionHandler<typeof Actions.SetVisibleQuery>(
            Actions.SetVisibleQuery.name,
            (state, action) => {
                state.visibleQueryIdx = action.payload.queryIdx
            }
        );

        this.addActionHandler<typeof GlobalActions.TileAreaClicked>(
            GlobalActions.TileAreaClicked.name,
            (state, action) => {
                if (action.payload.tileId === this.tileId) {
                    state.visibleMetadataLine = -1;
                }
            }
        );

        this.addActionHandler<typeof Actions.ShowLineMetadata>(
            Actions.ShowLineMetadata.name,
            (state, action) => {
                if (action.payload.tileId === this.tileId) {
                    state.visibleMetadataLine = action.payload.idx;
                }
            }
        );

        this.addActionHandler<typeof Actions.HideLineMetadata>(
            Actions.HideLineMetadata.name,
            (state, action) => {
                if (action.payload.tileId === this.tileId) {
                    state.visibleMetadataLine = -1;
                }
            }
        );
    }

    private createBackLink(
        state:ConcordanceTileState,
        concId:string
    ):BacklinkWithArgs<BacklinkArgs> {

        return this.backlink ?
            {
                url: this.backlink.url,
                method: this.backlink.method || HTTP.Method.GET,
                label: this.backlink.label,
                args: {
                    corpname: state.corpname,
                    usesubcorp: state.subcname,
                    q: `~${concId}`
                }
            } :
            null;
    }

    private reloadData(state:ConcordanceTileState, dispatch:SEDispatcher, otherLangCql:string):void {
        new Observable<{apiArgs:{}, queryIdx:number}>((observer) => {
            try {
                pipe(
                    this.queryMatches,
                    List.slice(0, this.queryType !== QueryType.CMP_QUERY ? 1 : this.queryMatches.length),
                    List.forEach((queryMatch, queryIdx) => {
                        observer.next({
                            apiArgs: this.concApi.stateToArgs(
                                state,
                                state.concordances[queryIdx].concId ?
                                        null : findCurrQueryMatch(queryMatch),
                                queryIdx,
                                otherLangCql
                            ),
                            queryIdx: queryIdx
                        });
                    })
                );
                observer.complete();

            } catch (e) {
                observer.error(e);
            }

        }).pipe(
            mergeMap(data => callWithExtraVal(this.concApi, data.apiArgs, data.queryIdx)),
            tap(
                ([resp, curr]) => {
                    dispatch<typeof Actions.PartialTileDataLoaded>({
                        name: Actions.PartialTileDataLoaded.name,
                        payload: {
                            tileId: this.tileId,
                            queryId: curr,
                            data: resp,
                            subqueries: List.map(
                                v => ({value: `${v.toknum}`, interactionId: v.interactionId}),
                                resp.lines
                            ),
                            domain1: null,
                            domain2: null
                        }
                    });
                }
            ),
            reduce(
                (acc, [resp, queryIdx]) => {
                    const concIds = [...acc.concIds];
                    concIds[queryIdx] = resp.concPersistenceID;
                    return {
                        concIds,
                        isEmpty: acc.isEmpty && resp.lines.length === 0
                    };
                },
                {concIds: List.repeat(_ => undefined, this.queryMatches.length), isEmpty: true}
            )

        ).subscribe({
            next: acc => {
                dispatch<typeof Actions.TileDataLoaded>({
                    name: Actions.TileDataLoaded.name,
                    payload: {
                        tileId: this.tileId,
                        isEmpty: acc.isEmpty,
                        concPersistenceIDs: [...acc.concIds],
                        corpusName: state.corpname
                    }
                });
            },
            error: err => {
                dispatch<typeof Actions.TileDataLoaded>({
                    name: Actions.TileDataLoaded.name,
                    error: err,
                    payload: {
                        tileId: this.tileId,
                        isEmpty: true,
                        concPersistenceIDs: [],
                        corpusName: state.corpname
                    }
                });
            }
        });
    }
}