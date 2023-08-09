/*
 * Copyright 2023 Martin Zimandl <martin.zimandl@gmail.com>
 * Copyright 2023 Institute of the Czech National Corpus,
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
import { StatelessModel, IActionQueue } from 'kombo';
import { IAppServices } from '../../../appServices';
import { Actions as GlobalActions } from '../../../models/actions';
import { Actions } from './common';
import { Backlink } from '../../../page/tile';
import { SyntacticCollsModelState } from '../../../models/tiles/syntacticColls';
import { QueryType } from '../../../query';
import { concat } from 'rxjs';
import { SyntacticCollsApi } from '../../../api/abstract/syntacticColls';
import { Dict, List } from 'cnc-tskit';
import { SCollsQueryType } from '../../../api/vendor/mquery/syntacticColls';


export interface SyntacticCollsModelArgs {
    dispatcher:IActionQueue;
    tileId:number;
    appServices:IAppServices;
    initState:SyntacticCollsModelState;
    waitForTile:number;
    waitForTilesTimeoutSecs:number;
    backlink:Backlink;
    queryType:QueryType;
    api:SyntacticCollsApi<any>;
    maxItems:number;
}


export class SyntacticCollsModel extends StatelessModel<SyntacticCollsModelState> {

    private readonly appServices:IAppServices;

    private readonly tileId:number;

    private readonly waitForTile:number;

    private readonly waitForTilesTimeoutSecs:number;

    private readonly queryType:QueryType;

    private readonly backlink:Backlink;

    private readonly api:SyntacticCollsApi<any>;

    private readonly maxItems:number;

    constructor({dispatcher, tileId, waitForTile, waitForTilesTimeoutSecs, appServices, initState, backlink, queryType, api, maxItems}:SyntacticCollsModelArgs) {
        super(dispatcher, initState);
        this.tileId = tileId;
        this.waitForTile = waitForTile;
        this.waitForTilesTimeoutSecs = waitForTilesTimeoutSecs;
        this.appServices = appServices;
        this.backlink = backlink;
        this.queryType = queryType;
        this.api = api;
        this.maxItems = maxItems;

        this.addActionSubtypeHandler(
            GlobalActions.EnableAltViewMode,
            action => action.payload.ident === this.tileId,
            (state, action) => {state.isAltViewMode = true}
        );

        this.addActionSubtypeHandler(
            GlobalActions.DisableAltViewMode,
            action => action.payload.ident === this.tileId,
            (state, action) => {state.isAltViewMode = false}
        );

        this.addActionHandler(
            GlobalActions.RequestQueryResponse,
            (state, action) => {
                state.isBusy = true;
                state.error = null;
            },
            (state, action, seDispatch) => {
                concat(...List.map(qType =>
                    this.api.call(this.api.stateToArgs(state, qType)),
                    state.displayTypes,
                )).subscribe({
                    next: ([qType, data]) => {
                        seDispatch<typeof Actions.TileDataLoaded>({
                            name: Actions.TileDataLoaded.name,
                            payload: {
                                tileId: this.tileId,
                                isEmpty: false,
                                data,
                                qType,
                            }
                        })
                    },
                    error: (error) => {
                        seDispatch<typeof Actions.TileDataLoaded>({
                            name: Actions.TileDataLoaded.name,
                            error,
                        })
                    },
                });
            }
        );

        this.addActionSubtypeHandler(
            Actions.TileDataLoaded,
            action => action.payload.tileId === this.tileId,
            (state, action) => {
                if (action.error) {
                    console.error(action.error);
                    state.isBusy = false;
                    state.error = this.appServices.normalizeHttpApiError(action.error);
                } else {
                    state.data[action.payload.qType] = action.payload.data.slice(0, this.maxItems);
                    if (List.every(qType => !!state.data[qType], state.displayTypes)) {
                        state.isBusy = false;
                    }
                }
            }
        );

        this.addActionHandler(
            GlobalActions.GetSourceInfo,
            (state, action) => {},
            (state, action, seDispatch) => {},
        );
    }
}