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

import { IAppServices } from '../../../appServices.js';
import { Actions as GlobalActions } from '../../../models/actions.js';
import { findCurrQueryMatch, RecognizedQueries } from '../../../query/index.js';

import { __Template__ModelState, Actions } from './common.js';
import { of as rxOf } from 'rxjs';
import { delay } from 'rxjs/operators';

export interface __Template__ModelArgs {
    dispatcher: IActionQueue;
    tileId: number;
    appServices: IAppServices;
    initState: __Template__ModelState;
    queryMatches: RecognizedQueries;
}

export class __Template__Model extends StatelessModel<__Template__ModelState> {
    private readonly queryMatches: RecognizedQueries;

    private readonly appServices: IAppServices;

    private readonly tileId: number;

    constructor({
        dispatcher,
        tileId,
        appServices,
        initState,
        queryMatches,
    }: __Template__ModelArgs) {
        super(dispatcher, initState);
        this.tileId = tileId;
        this.appServices = appServices;
        this.queryMatches = queryMatches;

        this.addActionHandler<typeof GlobalActions.EnableAltViewMode>(
            GlobalActions.EnableAltViewMode.name,
            (state, action) => {
                state.isAltViewMode = true;
            }
        );

        this.addActionHandler<typeof GlobalActions.DisableAltViewMode>(
            GlobalActions.DisableAltViewMode.name,
            (state, action) => {
                state.isAltViewMode = false;
            }
        );

        this.addActionHandler<typeof GlobalActions.EnableTileTweakMode>(
            GlobalActions.EnableTileTweakMode.name,
            (state, action) => {
                state.isTileTweakMode = true;
            }
        );

        this.addActionHandler<typeof GlobalActions.DisableTileTweakMode>(
            GlobalActions.DisableTileTweakMode.name,
            (state, action) => {
                state.isTileTweakMode = false;
            }
        );

        this.addActionHandler<typeof GlobalActions.RequestQueryResponse>(
            GlobalActions.RequestQueryResponse.name,
            (state, action) => {
                state.isBusy = true;
            },
            (state, action, seDispatch) => {
                this.fetchData(seDispatch);
            }
        );

        this.addActionHandler<typeof Actions.PartialTileDataLoaded>(
            Actions.PartialTileDataLoaded.name,
            (state, action) => {
                if (action.payload.tileId === this.tileId) {
                    state.data.push(action.payload.data);
                }
            }
        );

        this.addActionHandler<typeof Actions.TileDataLoaded>(
            Actions.TileDataLoaded.name,
            (state, action) => {
                if (action.payload.tileId === this.tileId) {
                    state.isBusy = false;
                }
            }
        );
    }

    fetchData(seDispatch: SEDispatcher) {
        rxOf(...this.queryMatches)
            .pipe(delay(2000))
            .subscribe(
                (next) => {
                    const currentQueryMatch = findCurrQueryMatch(next);
                    seDispatch<typeof Actions.PartialTileDataLoaded>({
                        name: Actions.PartialTileDataLoaded.name,
                        payload: {
                            tileId: this.tileId,
                            data: currentQueryMatch.word,
                        },
                    });
                },
                (error) => {
                    seDispatch<typeof Actions.TileDataLoaded>({
                        name: Actions.TileDataLoaded.name,
                        error,
                    });
                },
                () => {
                    seDispatch<typeof Actions.TileDataLoaded>({
                        name: Actions.TileDataLoaded.name,
                        payload: {
                            tileId: this.tileId,
                            isEmpty: false,
                        },
                    });
                }
            );
    }
}
