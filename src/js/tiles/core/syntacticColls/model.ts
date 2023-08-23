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
import { concat, map } from 'rxjs';
import { SyntacticCollsApi, SyntacticCollsExamplesApi } from '../../../api/abstract/syntacticColls';
import { List } from 'cnc-tskit';
import { SystemMessageType } from '../../../types';


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
    eApi:SyntacticCollsExamplesApi<any>;
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

    private readonly eApi:SyntacticCollsExamplesApi<any>;

    private readonly maxItems:number;

    constructor({
        dispatcher,
        tileId,
        waitForTile,
        waitForTilesTimeoutSecs,
        appServices,
        initState,
        backlink,
        queryType,
        api,
        eApi,
        maxItems
    }:SyntacticCollsModelArgs) {
        super(dispatcher, initState);
        this.tileId = tileId;
        this.waitForTile = waitForTile;
        this.waitForTilesTimeoutSecs = waitForTilesTimeoutSecs;
        this.appServices = appServices;
        this.backlink = backlink;
        this.queryType = queryType;
        this.api = api;
        this.eApi = eApi;
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
                            payload: {
                                tileId: this.tileId,
                                isEmpty: true,
                                data: undefined,
                                qType: undefined,
                            },
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
                state.exampleWindowData = undefined;
                if (action.error) {
                    console.error(action.error);
                    state.isBusy = false;
                    state.error = this.appServices.normalizeHttpApiError(action.error);
                    this.appServices.showMessage(SystemMessageType.ERROR, state.error);

                } else {
                    state.data[action.payload.qType] = action.payload.data;
                    state.data[action.payload.qType].rows = state.data[action.payload.qType].rows.slice(0, this.maxItems);
                    if (List.every(qType => !!state.data[qType], state.displayTypes)) {
                        state.isBusy = false;
                    }
                }
            }
        );

        this.addActionSubtypeHandler(
            Actions.ClickForExample,
            action => action.payload.tileId === this.tileId,
            (state, action) => {
                state.isBusy = true;
            },
            (state, action, dispatch) => {
                const q = state.data[action.payload.qType].examplesQueryTpl.replace('%s', action.payload.word);
                this.eApi.call(
                    this.eApi.stateToArgs(state, q)
                ).pipe(
                    map(
                        data => ({
                            ...data,
                            word1: state.queryMatch.word,
                            word2: action.payload.word
                        })
                    )

                ).subscribe({
                    next: (data) => {
                        dispatch(
                            Actions.ShowExampleWindow,
                            {
                                tileId: this.tileId,
                                data
                            }
                        );
                    },
                    error: (error) => {
                        dispatch({
                            name: Actions.ShowExampleWindow.name,
                            payload: { tileId: this.tileId },
                            error
                        });
                    }
                })
            }
        );

        this.addActionSubtypeHandler(
            Actions.ShowExampleWindow,
            action => action.payload.tileId === this.tileId,
            (state, action) => {
                state.isBusy = false;
                state.exampleWindowData = action.payload.data;
            }
        );

        this.addActionSubtypeHandler(
            Actions.HideExampleWindow,
            action => action.payload.tileId === this.tileId,
            (state, action) => {
                state.exampleWindowData = undefined;
            }
        );

        this.addActionHandler(
            GlobalActions.GetSourceInfo,
            (state, action) => {},
            (state, action, seDispatch) => {},
        );
    }
}