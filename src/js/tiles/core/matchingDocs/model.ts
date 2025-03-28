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
import { Action, SEDispatcher, StatelessModel, IActionDispatcher } from 'kombo';
import { Observable, Observer } from 'rxjs';
import { concatMap } from 'rxjs/operators';

import { IAppServices } from '../../../appServices.js';
import { Actions as GlobalActions } from '../../../models/actions.js';
import { Actions } from './actions.js';
import { MatchingDocsModelState } from '../../../models/tiles/matchingDocs.js';
import { MatchingDocsAPI } from '../../../api/abstract/matchingDocs.js';
import { findCurrQueryMatch } from '../../../models/query.js';
import { RecognizedQueries } from '../../../query/index.js';
import { List, pipe, Dict } from 'cnc-tskit';
import { Actions as ConcActions } from '../concordance/actions.js';


export interface MatchingDocsModelArgs {
    dispatcher:IActionDispatcher;
    tileId:number;
    waitForTiles:Array<number>;
    waitForTilesTimeoutSecs:number;
    subqSourceTiles:Array<number>;
    appServices:IAppServices;
    api:MatchingDocsAPI<{}>;
    initState:MatchingDocsModelState;
    queryMatches:RecognizedQueries;
}

export type ModelSyncData = {[tileId:string]:boolean};


export class MatchingDocsModel extends StatelessModel<MatchingDocsModelState> {

    private readonly queryMatches:RecognizedQueries;

    protected api:MatchingDocsAPI<{}>;

    protected readonly appServices:IAppServices;

    protected readonly tileId:number;

    protected readonly waitForTiles:Array<number>;

    protected readonly waitForTilesTimeoutSecs:number;

    protected readonly subqSourceTiles:Array<number>;

    constructor({dispatcher, tileId, waitForTiles, waitForTilesTimeoutSecs, subqSourceTiles, appServices,
            api, initState, queryMatches}:MatchingDocsModelArgs) {
        super(dispatcher, initState);
        this.tileId = tileId;
        this.waitForTiles = [...waitForTiles];
        this.waitForTilesTimeoutSecs = waitForTilesTimeoutSecs;
        this.subqSourceTiles = [...subqSourceTiles];
        this.appServices = appServices;
        this.api = api;
        this.queryMatches = queryMatches;

        this.addActionHandler<typeof GlobalActions.RequestQueryResponse>(
            GlobalActions.RequestQueryResponse.name,
            (state, action) => {
                state.isBusy = true;
                state.error = null;
            },
            (state, action, dispatch) => {
                this.handleDataLoad(state, action, dispatch);
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

        this.addActionHandler<typeof Actions.NextPage>(
            Actions.NextPage.name,
            (state, action) => {
                if (action.payload.tileId === this.tileId) {
                    if (state.currPage < state.numPages) {
                        state.currPage++;
                    }
                }
            }
        );

        this.addActionHandler<typeof Actions.PreviousPage>(
            Actions.PreviousPage.name,
            (state, action) => {
                if (action.payload.tileId === this.tileId) {
                    if (state.currPage > 1) {
                        state.currPage--;
                    }
                }
            }
        );

        this.addActionHandler<typeof Actions.TileDataLoaded>(
            GlobalActions.TileDataLoaded.name,
            (state, action) => {
                if (action.payload.tileId === this.tileId) {
                    if (action.error) {
                        state.data = [];
                        state.error = this.appServices.normalizeHttpApiError(action.error);
                        state.isBusy = false;
                        state.backlink = action.payload.backlink;

                    } else {
                        state.data = action.payload.data;
                        state.currPage = 1;
                        state.numPages = Math.ceil(state.data.length / state.maxNumCategoriesPerPage);
                        state.isBusy = false;
                        state.backlink = action.payload.backlink;
                    }
                }
            }
        );

        this.addActionHandler<typeof GlobalActions.GetSourceInfo>(
            GlobalActions.GetSourceInfo.name,
            null,
            (state, action, dispatch) => {
                if (action.payload.tileId === this.tileId) {
                    this.api.getSourceDescription(this.tileId, false, this.appServices.getISO639UILang(), state.corpname)
                    .subscribe({
                        next: (data) => {
                            dispatch({
                                name: GlobalActions.GetSourceInfoDone.name,
                                payload: {
                                    tileId: this.tileId,
                                    data: data
                                }
                            });
                        },
                        error: (err) => {
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
        )
    }

    private handleDataLoad(state:MatchingDocsModelState, action:Action, dispatch:SEDispatcher):void {
        if (this.waitForTiles.length > 0) {
            this.waitForActionWithTimeout(
                this.waitForTilesTimeoutSecs * 1000,
                pipe(this.waitForTiles, List.map<number, [string, boolean]>(v => [v.toFixed(), true]), Dict.fromEntries()),
                (action, syncStatus) => {
                    if (ConcActions.isTileDataLoaded(action) && this.waitForTiles.indexOf(action.payload.tileId) > -1) {
                        new Observable((observer:Observer<boolean>) => {
                            if (action.error) {
                                observer.error(new Error(this.appServices.translate('global__failed_to_obtain_required_data')));

                            } else {
                                observer.next(true);
                                observer.complete();
                            }

                        }).pipe(
                            concatMap(_ => this.api.call(this.tileId, true, this.api.stateToArgs(
                                state, List.head(action.payload.concPersistenceIDs))))

                        ).subscribe({
                            next: (resp) => {
                                dispatch<typeof Actions.TileDataLoaded>({
                                    name: Actions.TileDataLoaded.name,
                                    payload: {
                                        tileId: this.tileId,
                                        isEmpty: resp.data.length === 0,
                                        data: resp.data.sort((x1, x2) => x2.score - x1.score).slice(0, state.maxNumCategories),
                                        backlink: this.api.stateToBacklink(state,
                                            List.head(action.payload.concPersistenceIDs))
                                    }
                                });
                            },
                            error: error => {
                                dispatch<typeof Actions.TileDataLoaded>({
                                    name: Actions.TileDataLoaded.name,
                                    payload: {
                                        tileId: this.tileId,
                                        isEmpty: true,
                                        data: null,
                                        backlink: null
                                    },
                                    error: error
                                });
                            }
                        });
                        const ans = {...syncStatus, [action.payload.tileId]: false};
                        return Dict.hasValue(true, ans) ? ans : null;
                    }
                    return syncStatus;
                }
            );

        } else {
            const variant = findCurrQueryMatch(this.queryMatches[0]);
            this.api.call(this.tileId, true, this.api.stateToArgs(state, variant.word))
            .subscribe({
                next: (resp) => {
                    dispatch<typeof Actions.TileDataLoaded>({
                        name: Actions.TileDataLoaded.name,
                        payload: {
                            tileId: this.tileId,
                            isEmpty: resp.data.length === 0,
                            data: resp.data.sort((x1, x2) => x2.score - x1.score).slice(0, state.maxNumCategories),
                            backlink: this.api.stateToBacklink(state, null)
                        }
                    });
                },
                error: error => {
                    dispatch<typeof Actions.TileDataLoaded>({
                        name: Actions.TileDataLoaded.name,
                        payload: {
                            tileId: this.tileId,
                            isEmpty: true,
                            data: null,
                            backlink: null
                        },
                        error: error
                    });
                }
            });
        }
    }
}
