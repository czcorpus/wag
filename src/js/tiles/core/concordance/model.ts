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

import { IAppServices } from '../../../appServices';
import { IConcordanceApi, SingleConcLoadedPayload } from '../../../api/abstract/concordance';
import { ConcordanceMinState, createInitialLinesData } from '../../../models/tiles/concordance';
import { SystemMessageType } from '../../../types';
import { isSubqueryPayload, RecognizedQueries, QueryType } from '../../../query/index';
import { Backlink, BacklinkWithArgs } from '../../../page/tile';
import { ActionName as GlobalActionName, Actions as GlobalActions } from '../../../models/actions';
import { findCurrQueryMatch } from '../../../models/query';
import { importMessageType } from '../../../page/notifications';
import { ActionName, Actions, ConcLoadedPayload } from './actions';
import { normalizeTypography } from '../../../models/tiles/concordance/normalize';
import { isCollocSubqueryPayload } from '../../../api/abstract/collocations';
import { callWithExtraVal } from '../../../api/util';



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
    backlink:BacklinkWithArgs<BacklinkArgs>;
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

    private readonly service:IConcordanceApi<{}>;

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
        this.service = service;
        this.queryMatches = queryMatches;
        this.appServices = appServices;
        this.tileId = tileId;
        this.backlink = backlink;
        this.waitForTile = waitForTile;
        this.waitForTilesTimeoutSecs = waitForTilesTimeoutSecs;
        this.queryType = queryType;

        this.addActionHandler<GlobalActions.SetScreenMode>(
            GlobalActionName.SetScreenMode,
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

        this.addActionHandler<GlobalActions.RequestQueryResponse>(
            GlobalActionName.RequestQueryResponse,
            (state, action) => {
                state.isBusy = true;
                state.error = null;
            },
            (state, action, dispatch) => {
                if (this.waitForTile >= 0) {
                    this.suspendWithTimeout(
                        this.waitForTilesTimeoutSecs,
                        {},
                        (action:GlobalActions.TileDataLoaded<{}>, syncData) => {
                            if (action.name === GlobalActionName.TileDataLoaded && action.payload.tileId === this.waitForTile) {
                                if (isCollocSubqueryPayload(action.payload)) {
                                    const cql = `[word="${action.payload.subqueries.map(v => v.value.value).join('|')}"]`; // TODO escape
                                    this.reloadData(state, dispatch, cql);

                                } else if (isSubqueryPayload(action.payload)) {
                                    const cql = `[word="${action.payload.subqueries.map(v => v.value).join('|')}"]`; // TODO escape
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

        this.addActionHandler<GlobalActions.TilePartialDataLoaded<SingleConcLoadedPayload>>(
            GlobalActionName.TilePartialDataLoaded,
            (state, action) => {
                // note: error is handled via TileDataLoaded
                if (action.payload.tileId === this.tileId && !action.error) {
                    action.payload.data.messages.forEach(msg => console.log(`${importMessageType(msg[0]).toUpperCase()}: conc - ${msg[1]}`));
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

        this.addActionHandler<GlobalActions.TileDataLoaded<ConcLoadedPayload>>(
            GlobalActionName.TileDataLoaded,
            (state, action) => {
                if (action.payload.tileId === this.tileId) {
                    state.isBusy = false;
                    if (action.error) {
                        state.concordances = createInitialLinesData(this.queryMatches.length);
                        state.error = this.appServices.decodeError(action.error);

                    } else {
                        state.backlink = this.createBackLink(state, action);
                    }
                }
            }
        );

        this.addActionHandler<Actions.LoadNextPage>(
            ActionName.LoadNextPage,
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
            ActionName.LoadPrevPage,
            ActionName.SetViewMode
        );

        this.addActionHandler<Actions.LoadPrevPage>(
            ActionName.LoadPrevPage,
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

        this.addActionHandler<Actions.SetViewMode>(
            ActionName.SetViewMode,
            (state, action) => {
                if (action.payload.tileId === this.tileId) {
                    state.isBusy = true;
                    state.error = null;
                    state.viewMode = action.payload.mode;
                }
            }
        );

        this.addActionHandler<GlobalActions.GetSourceInfo>(
            GlobalActionName.GetSourceInfo,
            null,
            (state, action, dispatch) => {
                if (action.payload.tileId === this.tileId) {
                    this.service.getSourceDescription(this.tileId, this.appServices.getISO639UILang(), state.corpname)
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
                                    tileId: this.tileId,
                                }
                            });
                        }
                    );
                }
            }
        );

        this.addActionHandler<Actions.SetVisibleQuery>(
            ActionName.SetVisibleQuery,
            (state, action) => {
                state.visibleQueryIdx = action.payload.queryIdx
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
    }

    private createBackLink(state:ConcordanceTileState, action:GlobalActions.TileDataLoaded<ConcLoadedPayload>):BacklinkWithArgs<BacklinkArgs> {
        return this.backlink && this.queryType !== QueryType.CMP_QUERY ?
            {
                url: this.backlink.url,
                method: this.backlink.method || HTTP.Method.GET,
                label: this.backlink.label,
                args: {
                    corpname: state.corpname,
                    usesubcorp: state.subcname,
                    q: `~${action.payload.concPersistenceIDs[0]}`
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
                            apiArgs: this.service.stateToArgs(state, state.concordances[queryIdx].concId ?
                                        null : findCurrQueryMatch(queryMatch), queryIdx, otherLangCql),
                            queryIdx: queryIdx
                        });
                    })
                );
                observer.complete();

            } catch (e) {
                observer.error(e);
            }

        }).pipe(
            mergeMap(data => callWithExtraVal(this.service, data.apiArgs, data.queryIdx)),
            tap(
                ([resp, curr]) => {
                    dispatch<GlobalActions.TilePartialDataLoaded<SingleConcLoadedPayload>>({
                        name: GlobalActionName.TilePartialDataLoaded,
                        payload: {
                            tileId: this.tileId,
                            queryId: curr,
                            data: resp,
                            subqueries: List.map(v => ({value: `${v.toknum}`, interactionId: v.interactionId}), resp.lines),
                            lang1: null,
                            lang2: null
                        }
                    });
                }
            ),
            reduce(
                (acc, [resp,]) => ({
                    concIds: List.concat([resp.concPersistenceID], acc.concIds),
                    isEmpty: acc.isEmpty && resp.lines.length === 0
                }),
                {concIds: [], isEmpty: true}
            )

        ).subscribe(
            (acc) => {
                dispatch<GlobalActions.TileDataLoaded<ConcLoadedPayload>>({
                    name: GlobalActionName.TileDataLoaded,
                    payload: {
                        tileId: this.tileId,
                        isEmpty: acc.isEmpty,
                        concPersistenceIDs: [...acc.concIds],
                        corpusName: state.corpname
                    }
                });
            },
            (err) => {
                dispatch<GlobalActions.TileDataLoaded<ConcLoadedPayload>>({
                    name: GlobalActionName.TileDataLoaded,
                    error: err,
                    payload: {
                        tileId: this.tileId,
                        isEmpty: true,
                        concPersistenceIDs: [],
                        corpusName: state.corpname
                    }
                });
            }
        );
    }
}