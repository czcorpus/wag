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

import {StatelessModel, Action, ActionDispatcher} from 'kombo';
import { ActionName, Actions } from './actions';
import * as Immutable from 'immutable';
import { AppServices } from '../appServices';
import { SystemMessage } from '../notifications';


export interface WdglanceTilesState {
    framesSizes:Immutable.List<[number, number]>;
    expandedTile:number;
    systemMessages:Immutable.List<SystemMessage>;
}


export class WdglanceTilesModel extends StatelessModel<WdglanceTilesState> {

    private readonly appServices:AppServices;

    constructor(dispatcher:ActionDispatcher, appServices:AppServices) {
        super(
            dispatcher,
            {
                framesSizes:Immutable.List<[number, number]>(),
                expandedTile: -1,
                systemMessages: Immutable.List<SystemMessage>()
            }
        );
        this.appServices = appServices;
        this.actionMatch = {
            [ActionName.AcknowledgeSizes]: (state, action:Actions.AcknowledgeSizes) => {
                const newState = this.copyState(state);
                newState.framesSizes = Immutable.List<[number, number]>(action.payload.values);
                return newState;
            },
            [ActionName.ExpandTile]: (state, action:Actions.ExpandTile) => {
                const newState = this.copyState(state);
                newState.expandedTile = action.payload.ident;
                return newState;
            },
            [ActionName.ResetExpandTile]: (state, action:Actions.ExpandTile) => {
                const newState = this.copyState(state);
                newState.expandedTile = -1;
                return newState;
            },
            [ActionName.AddSystemMessage]: (state, action:Actions.AddSystemMessage) => {
                const newState = this.copyState(state);
                newState.systemMessages = newState.systemMessages.push({
                    type: action.payload.type,
                    text: action.payload.text,
                    ttl: action.payload.ttl,
                    ident: action.payload.ident
                });
                return newState;
            },
            [ActionName.RemoveSystemMessage]: (state, action:Actions.RemoveSystemMessage) => {
                const newState = this.copyState(state);
                const srchIdx = newState.systemMessages.findIndex(v => v.ident === action.payload['ident']);
                if (srchIdx > -1) {
                    newState.systemMessages = newState.systemMessages.remove(srchIdx);
                }
                return newState;
            },
        };
    }

    getFrameSize(idx:number):[number, number] {
        return this.getState().framesSizes.get(idx);
    }
}