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
import { QueryType } from '../../../query/index';


export interface SyntacticCollsModelArgs {
    dispatcher:IActionQueue;
    tileId:number;
    appServices:IAppServices;
    initState:SyntacticCollsModelState;
    waitForTile:number;
    waitForTilesTimeoutSecs:number;
    backlink:Backlink;
    queryType:QueryType;
    apiType:string;
}


export class SyntacticCollsModel extends StatelessModel<SyntacticCollsModelState> {

    private readonly appServices:IAppServices;

    private readonly tileId:number;

    private readonly waitForTile:number;

    private readonly waitForTilesTimeoutSecs:number;

    private readonly queryType:QueryType;

    private readonly apiType:string;

    private readonly backlink:Backlink;

    constructor({dispatcher, tileId, waitForTile, waitForTilesTimeoutSecs, appServices, initState, backlink, queryType, apiType}:SyntacticCollsModelArgs) {
        super(dispatcher, initState);
        this.tileId = tileId;
        this.waitForTile = waitForTile;
        this.waitForTilesTimeoutSecs = waitForTilesTimeoutSecs;
        this.appServices = appServices;
        this.backlink = backlink;
        this.queryType = queryType;
        this.apiType = apiType;

        this.addActionHandler<typeof GlobalActions.RequestQueryResponse>(
            GlobalActions.RequestQueryResponse.name,
            (state, action) => {
                state.isBusy = true;
                state.error = null;
            },
            (state, action, seDispatch) => {
                seDispatch<typeof Actions.TileDataLoaded>({
                    name: Actions.TileDataLoaded.name,
                    payload: {
                        tileId: this.tileId,
                        isEmpty: false,
                    }
                })
            }
        );

        this.addActionHandler<typeof Actions.TileDataLoaded>(
            Actions.TileDataLoaded.name,
            (state, action) => {
                if (action.payload.tileId === this.tileId) {
                    state.isBusy = false;
                    if (action.error) {
                        console.error(action.error);
                        state.error = this.appServices.normalizeHttpApiError(action.error);
                    }
                }
            }
        );

        this.addActionHandler<typeof GlobalActions.GetSourceInfo>(
            GlobalActions.GetSourceInfo.name,
            (state, action) => {},
            (state, action, seDispatch) => {},
        );
    }
}