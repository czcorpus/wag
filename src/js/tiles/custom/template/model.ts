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

import { IAppServices } from '../../../appServices';
import { ActionName as GlobalActionName, Actions as GlobalActions } from '../../../models/actions';
import { RecognizedQueries } from '../../../query/index';

import { DataLoadedPayload, __Template__ModelState, PartialDataLoadedPayload } from './common';
import { of as rxOf } from 'rxjs';
import { findCurrQueryMatch } from '../../../models/query';
import { delay } from 'rxjs/operators';


export interface __Template__ModelArgs {
    dispatcher:IActionQueue;
    tileId:number;
    appServices:IAppServices;
    initState:__Template__ModelState;
    queryMatches:RecognizedQueries;
}


export class __Template__Model extends StatelessModel<__Template__ModelState> {

    private readonly queryMatches:RecognizedQueries;

    private readonly appServices:IAppServices;

    private readonly tileId:number;

    constructor({dispatcher, tileId, appServices, initState, queryMatches}:__Template__ModelArgs) {
        super(dispatcher, initState);
        this.tileId = tileId;
        this.appServices = appServices;
        this.queryMatches = queryMatches;

        this.addActionHandler<GlobalActions.EnableAltViewMode>(
            GlobalActionName.EnableAltViewMode,
            (state, action) => {
                state.isAltViewMode = true;
            }
        );

        this.addActionHandler<GlobalActions.DisableAltViewMode>(
            GlobalActionName.DisableAltViewMode,
            (state, action) => {
                state.isAltViewMode = false;
            }
        );

        this.addActionHandler<GlobalActions.EnableTileTweakMode>(
            GlobalActionName.EnableTileTweakMode,
            (state, action) => {
                state.isTileTweakMode = true;
            }
        );

        this.addActionHandler<GlobalActions.DisableTileTweakMode>(
            GlobalActionName.DisableTileTweakMode,
            (state, action) => {
                state.isTileTweakMode = false;
            }
        );

        this.addActionHandler<GlobalActions.RequestQueryResponse>(
            GlobalActionName.RequestQueryResponse,
            (state, action) => {
                state.isBusy = true;
            },
            (state, action, seDispatch) => {
                this.fetchData(seDispatch);
            }
        );

        this.addActionHandler<GlobalActions.TilePartialDataLoaded<PartialDataLoadedPayload>>(
            GlobalActionName.TilePartialDataLoaded,
            (state, action) => {
                if (action.payload.tileId === this.tileId) {
                    state.data.push(action.payload.data)
                }
            }
        );

        this.addActionHandler<GlobalActions.TileDataLoaded<DataLoadedPayload>>(
            GlobalActionName.TileDataLoaded,
            (state, action) => {
                if (action.payload.tileId === this.tileId) {
                    state.isBusy = false;
                }
            }
        );
    }

    fetchData(seDispatch: SEDispatcher) {
        rxOf(...this.queryMatches)
        .pipe(
            delay(2000)
        )
        .subscribe(
            next => {
                const currentQueryMatch = findCurrQueryMatch(next);
                seDispatch<GlobalActions.TilePartialDataLoaded<PartialDataLoadedPayload>>({
                    name: GlobalActionName.TilePartialDataLoaded,
                    payload: {
                        tileId: this.tileId,
                        data: currentQueryMatch.word
                    }
                });
            },
            error => {
                seDispatch<GlobalActions.TileDataLoaded<DataLoadedPayload>>({
                    name: GlobalActionName.TileDataLoaded,
                    payload: {
                        tileId: this.tileId,
                        isEmpty: true,
                        error: error
                    }
                });
            },
            () => {
                seDispatch<GlobalActions.TileDataLoaded<DataLoadedPayload>>({
                    name: GlobalActionName.TileDataLoaded,
                    payload: {
                        tileId: this.tileId,
                        isEmpty: false,
                    }
                });
            }
        );
    }
}