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
import { StatelessModel, StatefulModel, Action, IFullActionControl } from 'kombo';
import { Actions } from '../models/actions';
import { List, Dict } from 'cnc-tskit';
import { ITileProvider, ITileReloader } from '../page/tile';



interface ModelInfo {
    model:StatelessModel<{}>;
    isError:boolean;
    blockers:Array<number>;
}

interface RetryTileLoadState {
    models:{[k:string]:ModelInfo};
    lastAction:Action|null;
}


/**
 * This special model allows restarting tile load after error. It is
 * able to handle tile dependencies too (=> single tile reload may
 * trigger a number of other tiles to reload too).
 */
export class RetryTileLoad extends StatefulModel<RetryTileLoadState> implements ITileReloader {

    private readonly reloadDispatcher:IFullActionControl;

    constructor(dispatcher:IFullActionControl) {
        super(
            dispatcher,
            {
                models: {},
                lastAction: null
            }
        );
        this.reloadDispatcher = dispatcher;
    }

    /**
     * Blocked groups means any tile dependent on tileId and
     * any tile tileId is dependent on (in this case including
     * transitive dependencies).
     */
    private getBlockedGroup(tileId:number):Array<number> {
        let ans = [tileId];
        let toProc = this.state.models[tileId.toFixed()].blockers;
        while (toProc.length > 0) {
            const item = toProc[0];
            toProc = List.shift(toProc);
            ans = List.addUnique(item, ans);
            const model = this.state.models[item.toFixed()];
            if (model) {
                toProc = toProc.concat(this.state.models[item.toFixed()].blockers);

            } else {
                console.error('Tile dependency misconfiguration related to tile ', item);
            }
        }
        Dict.forEach(
            (model, ident) => {
                if (model.blockers.indexOf(tileId) > -1) {
                    ans = List.addUnique(parseInt(ident), ans);
                }
            },
            this.state.models
        );
        return ans;
    }

    onAction(action:Action) {
        switch (action.name) {
            case Actions.RetryTileLoad.name:
                const blockedGroup = this.getBlockedGroup(action.payload['tileId']);
                Dict.forEach(
                    (model, ident) => {
                        if (!blockedGroup.some(x => x.toFixed() === ident)) {
                            model.model.waitForActionWithTimeout(5000, {}, (action, syncData) => {
                                if (action.name === Actions.WakeSuspendedTiles.name) {
                                    return true;
                                }
                                return false;
                            });
                        }
                    },
                    this.state.models
                );
                this.reloadDispatcher.dispatch(this.state.lastAction);
                this.reloadDispatcher.dispatch({
                    name: Actions.WakeSuspendedTiles.name
                });
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
                            ...{[action.payload['tileId']]:{
                                model: m.model,
                                isError: true,
                                blockers: m.blockers
                            }}
                        }
                    }
                }
            break;
        }
    }

    registerModel(tile:ITileProvider, model:StatelessModel<{}>):void {
        if (model) {
            this.state.models = {
                ...this.state.models,
                ...{[tile.getIdent().toFixed()]:
                    {
                        model: model,
                        isError: false,
                        blockers: tile.getBlockingTiles()
                    }
                }
            };
        }
    }

    unregister():void {
    }

}