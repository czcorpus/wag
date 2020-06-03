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

import { IAppServices } from '../../../appServices';
import { ActionName as GlobalActionName, Actions as GlobalActions } from '../../../models/actions';
import { ConcLoadedPayload } from '../concordance/actions';
import { ActionName, Actions, DataLoadedPayload } from './actions';
import { MatchingDocsModelState } from '../../../models/tiles/matchingDocs';
import { MatchingDocsAPI } from '../../../api/abstract/matchingDocs';
import { findCurrQueryMatch } from '../../../models/query';
import { RecognizedQueries } from '../../../query/index';
import { List, pipe, Dict } from 'cnc-tskit';


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


export class MatchingDocsModel extends StatelessModel<MatchingDocsModelState, ModelSyncData> {

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

        this.addActionHandler<GlobalActions.RequestQueryResponse>(
            GlobalActionName.RequestQueryResponse,
            (state, action) => {
                state.isBusy = true;
                state.error = null;
            },
            (state, action, dispatch) => {
                this.handleDataLoad(state, action, dispatch);
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

        this.addActionHandler<Actions.NextPage>(
            ActionName.NextPage,
            (state, action) => {
                if (action.payload.tileId === this.tileId) {
                    if (state.currPage < state.numPages) {
                        state.currPage++;
                    }
                }
            }
        );

        this.addActionHandler<Actions.PreviousPage>(
            ActionName.PreviousPage,
            (state, action) => {
                if (action.payload.tileId === this.tileId) {
                    if (state.currPage > 1) {
                        state.currPage--;
                    }
                }
            }
        );

        this.addActionHandler<GlobalActions.TileDataLoaded<DataLoadedPayload>>(
            GlobalActionName.TileDataLoaded,
            (state, action) => {
                if (action.payload.tileId === this.tileId) {
                    if (action.error) {
                        state.data = [];
                        state.error = action.error.message;
                        state.isBusy = false;
                        state.backlink = action.payload.backlink;

                    } else {
                        state.data = List.map(
                            v => ({
                                name: this.appServices.translateResourceMetadata(state.corpname, v.name),
                                score: v.score
                            }),
                            action.payload.data
                        );
                        state.currPage = 1;
                        state.numPages = Math.ceil(state.data.length / state.maxNumCategoriesPerPage);
                        state.isBusy = false;
                        state.backlink = action.payload.backlink;
                    }
                }
            }
        );

        this.addActionHandler<GlobalActions.GetSourceInfo>(
            GlobalActionName.GetSourceInfo,
            null,
            (state, action, dispatch) => {
                if (action.payload.tileId === this.tileId) {
                    this.api.getSourceDescription(this.tileId, this.appServices.getISO639UILang(), state.corpname)
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
                                    tileId: this.tileId
                                }

                            });
                        }
                    );
                }
            }
        )
    }

    private handleDataLoad(state:MatchingDocsModelState, action:Action, dispatch:SEDispatcher):void {
        if (this.waitForTiles.length > 0) {
            this.suspendWithTimeout(
                this.waitForTilesTimeoutSecs * 1000,
                pipe(this.waitForTiles, List.map<number, [string, boolean]>(v => [v.toFixed(), true]), Dict.fromEntries()),
                (action, syncStatus) => {
                    if (action.name === GlobalActionName.TileDataLoaded && this.waitForTiles.indexOf(action.payload['tileId']) > -1) {
                        const payload = (action as GlobalActions.TileDataLoaded<ConcLoadedPayload>).payload;
                        new Observable((observer:Observer<boolean>) => {
                            if (action.error) {
                                observer.error(new Error(this.appServices.translate('global__failed_to_obtain_required_data')));

                            } else {
                                observer.next(true);
                                observer.complete();
                            }

                        }).pipe(
                            concatMap(_ => this.api.call(this.api.stateToArgs(state, payload.concPersistenceIDs[0])))

                        ).subscribe(
                            (resp) => {
                                dispatch<GlobalActions.TileDataLoaded<DataLoadedPayload>>({
                                    name: GlobalActionName.TileDataLoaded,
                                    payload: {
                                        tileId: this.tileId,
                                        isEmpty: resp.data.length === 0,
                                        data: resp.data.sort((x1, x2) => x2.score - x1.score).slice(0, state.maxNumCategories),
                                        backlink: this.api.stateToBacklink(state, payload.concPersistenceIDs[0])
                                    }
                                });
                            },
                            error => {
                                dispatch<GlobalActions.TileDataLoaded<DataLoadedPayload>>({
                                    name: GlobalActionName.TileDataLoaded,
                                    payload: {
                                        tileId: this.tileId,
                                        isEmpty: true,
                                        data: null,
                                        backlink: null
                                    },
                                    error: error
                                });
                            }
                        );
                        const ans = {...syncStatus, [payload.tileId]: false};
                        return Dict.hasValue(true, ans) ? ans : null;
                    }
                    return syncStatus;
                }
            );

        } else {
            const variant = findCurrQueryMatch(this.queryMatches[0]);
            this.api.call(this.api.stateToArgs(state, variant.word))
            .subscribe(
                (resp) => {
                    dispatch<GlobalActions.TileDataLoaded<DataLoadedPayload>>({
                        name: GlobalActionName.TileDataLoaded,
                        payload: {
                            tileId: this.tileId,
                            isEmpty: resp.data.length === 0,
                            data: resp.data.sort((x1, x2) => x2.score - x1.score).slice(0, state.maxNumCategories),
                            backlink: this.api.stateToBacklink(state, null)
                        }
                    });
                },
                error => {
                    dispatch<GlobalActions.TileDataLoaded<DataLoadedPayload>>({
                        name: GlobalActionName.TileDataLoaded,
                        payload: {
                            tileId: this.tileId,
                            isEmpty: true,
                            data: null,
                            backlink: null
                        },
                        error: error
                    });
                }
            );
        }
    }
}
