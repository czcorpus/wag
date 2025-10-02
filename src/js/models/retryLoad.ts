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
import {
    StatelessModel,
    StatefulModel,
    Action,
    IFullActionControl,
} from 'kombo';

import { Actions } from '../models/actions.js';
import { ITileProvider, ITileReloader } from '../page/tile.js';

interface ReloadModelInfo {
    model: StatelessModel<{}>;
    isError: boolean;
    readDataFrom: number | null;
}

interface RetryTileLoadState {
    models: { [k: string]: ReloadModelInfo };
    lastAction: Action | null;
}

/**
 * This special model allows restarting tile load after error. It is
 * able to handle tile dependencies too (=> single tile reload may
 * trigger a number of other tiles to reload too).
 */
export class RetryTileLoad
    extends StatefulModel<RetryTileLoadState>
    implements ITileReloader
{
    private readonly reloadDispatcher: IFullActionControl;

    constructor(dispatcher: IFullActionControl) {
        super(dispatcher, {
            models: {},
            lastAction: null,
        });
        this.reloadDispatcher = dispatcher;
    }

    onAction(action: Action) {
        switch (action.name) {
            case Actions.RetryTileLoad.name:
                this.reloadDispatcher.dispatch(this.state.lastAction);
                break;
            case Actions.RequestQueryResponse.name:
                this.state.lastAction = action;
                break;
            case Actions.TileDataLoaded.name:
                if (action.error) {
                    const m = this.state.models[action.payload['tileId']];
                    if (m) {
                        this.state.models = {
                            ...this.state.models,
                            ...{
                                [action.payload['tileId']]: {
                                    model: m.model,
                                    isError: true,
                                    readDataFrom: m.readDataFrom,
                                },
                            },
                        };
                    }
                }
                break;
        }
    }

    registerModel(tile: ITileProvider, model: StatelessModel<{}>): void {
        if (model) {
            this.state.models = {
                ...this.state.models,
                ...{
                    [tile.getIdent().toFixed()]: {
                        model: model,
                        isError: false,
                        readDataFrom: tile.getReadDataFrom(),
                    },
                },
            };
        }
    }

    unregister(): void {}
}
