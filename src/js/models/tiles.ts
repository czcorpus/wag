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

import {StatelessModel, ActionDispatcher} from 'kombo';
import { ActionName, Actions } from './actions';
import * as Immutable from 'immutable';
import { AppServices } from '../appServices';
import { TileFrameProps } from '../abstract/types';


export interface WdglanceTilesState {
    isAnswerMode:boolean;
    expandedTiles:Immutable.Set<number>;
    tileProps:Immutable.List<TileFrameProps>;
}


export class WdglanceTilesModel extends StatelessModel<WdglanceTilesState> {

    private readonly appServices:AppServices;

    constructor(dispatcher:ActionDispatcher, initialState:WdglanceTilesState, appServices:AppServices) {
        super(dispatcher, initialState);
        this.appServices = appServices;
        this.actionMatch = {
            [ActionName.AcknowledgeSize]: (state, action:Actions.AcknowledgeSize) => {
                const newState = this.copyState(state);
                newState.tileProps = newState.tileProps.map(tile => {
                    return {
                        tileId: tile.tileId,
                        Component: tile.Component,
                        label: tile.label,
                        supportsExtendedView: tile.supportsExtendedView,
                        queryTypeSupport: tile.queryTypeSupport,
                        renderSize: action.payload.size,
                        isHidden: tile.isHidden
                    }
                }).toList();
                return newState;
            },
            [ActionName.ExpandTile]: (state, action:Actions.ExpandTile) => {
                const newState = this.copyState(state);
                newState.expandedTiles = newState.expandedTiles.add(action.payload.ident);
                return newState;
            },
            [ActionName.ResetExpandTile]: (state, action:Actions.ExpandTile) => {
                const newState = this.copyState(state);
                newState.expandedTiles = newState.expandedTiles.remove(action.payload.ident);
                return newState;
            },
            [ActionName.EnableAnswerMode]: (state, action:Actions.EnableAnswerMode) => {
                const newState = this.copyState(state);
                newState.isAnswerMode = true;
                return newState;
            },
            [ActionName.DisableAnswerMode]: (state, action:Actions.DisableAnswerMode) => {
                const newState = this.copyState(state);
                newState.isAnswerMode = true;
                return newState;
            }
        };
    }
}