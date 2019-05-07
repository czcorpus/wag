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
import * as Immutable from 'immutable';

import { StatelessModel, ActionDispatcher, StatefulModel, Action, IActionDispatcher } from 'kombo';
import { ActionName} from '../models/actions';



interface ModelInfo {
    model:StatelessModel<{}>;
    isError:boolean;
    blockers:Array<number>;
}

interface RetryTileLoadState {
    models:Immutable.Map<number, ModelInfo>;
    lastAction:Action|null;
}


/**
 * This special model allows restarting tile load after error. It is
 * able to handle tile dependencies too (=> single tile reload may
 * trigger a number of other tiles to reload too).
 */
export class RetryTileLoad extends StatefulModel<RetryTileLoadState> {

    private readonly reloadDispatcher:IActionDispatcher;

    constructor(dispatcher:IActionDispatcher) {
        super(
            dispatcher,
            {
                models: Immutable.Map<number, ModelInfo>(),
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
    private getBlockedGroup(tileId:number):Immutable.Set<number> {
        let ans = Immutable.Set<number>([tileId]);
        let toProc = Immutable.List<number>(this.state.models.get(tileId).blockers);
        while (toProc.size > 0) {
            const item = toProc.first();
            ans = ans.add(item);
            toProc = toProc.shift().concat(this.state.models.get(item).blockers).toList();
        }
        this.state.models.forEach((model, ident) => {
            if (model.blockers.indexOf(tileId) > -1) {
                ans = ans.add(ident);
            }
        });
        return ans;
    }

    onAction(action:Action) {
        switch (action.name) {
            case ActionName.RetryTileLoad:
                const blockedGroup = this.getBlockedGroup(action.payload['tileId']);
                this.state.models.forEach((model, ident) => {
                    if (!blockedGroup.includes(ident)) {
                        model.model.suspend((action) => {
                            if (action.name === ActionName.WakeSuspendedTiles) {
                                return true;
                            }
                            return false;
                        });
                    }
                });
                this.reloadDispatcher.dispatch(this.state.lastAction);
                this.reloadDispatcher.dispatch({
                    name: ActionName.WakeSuspendedTiles
                });
            break;
            case ActionName.RequestQueryResponse:
                this.state.lastAction = action;
            break;
            case ActionName.TileDataLoaded:
                if (action.error) {
                    const m = this.state.models.get(action.payload['tileId']);
                    if (m) {
                        this.state.models = this.state.models.set(
                            action.payload['tileId'],
                            {
                                model: m.model,
                                isError: true,
                                blockers: m.blockers
                            }
                        );
                    }
                }
            break;
        }
    }

    registerModel(ident:number, model:StatelessModel<{}>, blockers:Array<number>):void {
        if (model) {
            this.state.models = this.state.models.set(
                ident,
                {
                    model: model,
                    isError: false,
                    blockers: blockers
                }
            );
        }
    }

}