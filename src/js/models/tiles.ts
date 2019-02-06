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

import {StatelessModel, ActionDispatcher, Action, SEDispatcher} from 'kombo';
import { ActionName, Actions } from './actions';
import * as Immutable from 'immutable';
import { AppServices } from '../appServices';
import { TileFrameProps, SystemMessageType } from '../abstract/types';
import { CorpusInfoAPI, APIResponse } from '../shared/api/corpusInfo';


export interface WdglanceTilesState {
    isAnswerMode:boolean;
    isBusy:boolean;
    expandedTiles:Immutable.Set<number>;
    hiddenGroups:Immutable.Set<number>;
    tileProps:Immutable.List<TileFrameProps>;
    corpusInfoData:APIResponse|null;
}


export class WdglanceTilesModel extends StatelessModel<WdglanceTilesState> {

    private readonly appServices:AppServices;

    private readonly corpusInfoApi:CorpusInfoAPI;

    constructor(dispatcher:ActionDispatcher, initialState:WdglanceTilesState, appServices:AppServices, corpusInfoApi:CorpusInfoAPI) {
        super(dispatcher, initialState);
        this.appServices = appServices;
        this.corpusInfoApi = corpusInfoApi;
        this.actionMatch = {
            [ActionName.AcknowledgeSize]: (state, action:Actions.AcknowledgeSize) => {
                const newState = this.copyState(state);
                const srchId = newState.tileProps.findIndex(v => v.tileId === action.payload.tileId);
                if (srchId > -1) {
                    const tile = newState.tileProps.get(srchId);
                    newState.tileProps = newState.tileProps.set(
                        srchId,
                        {
                            tileId: tile.tileId,
                            Component: tile.Component,
                            label: tile.label,
                            supportsExtendedView: tile.supportsExtendedView,
                            supportsCurrQueryType: tile.supportsCurrQueryType,
                            renderSize: [action.payload.size[0] + tile.tileId, action.payload.size[1]],
                            widthFract: tile.widthFract,
                            extWidthFract: tile.extWidthFract,
                            isHidden: tile.isHidden
                        }
                    );
                    return newState;
                }
                return state;
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
            },
            [ActionName.GetCorpusInfo]: (state, action:Actions.GetCorpusInfo) => {
                const newState = this.copyState(state);
                newState.corpusInfoData = null;
                newState.isBusy = true;
                return newState;
            },
            [ActionName.GetCorpusInfoDone]: (state, action:Actions.GetCorpusInfoDone) => {
                const newState = this.copyState(state);
                newState.isBusy = false;
                if (action.error) {
                    newState.corpusInfoData = null;

                } else {
                    newState.corpusInfoData = action.payload.data
                }
                return newState;
            },
            [ActionName.CloseCorpusInfo]: (state, action:Actions.CloseCorpusInfo) => {
                const newState = this.copyState(state);
                newState.corpusInfoData = null;
                return newState;
            },
            [ActionName.ToggleGroupVisibility]: (state, action:Actions.ToggleGroupVisibility) => {
                const newState = this.copyState(state);
                if (newState.hiddenGroups.contains(action.payload.groupIdx)) {
                    newState.hiddenGroups = newState.hiddenGroups.remove(action.payload.groupIdx);

                } else {
                    newState.hiddenGroups = newState.hiddenGroups.add(action.payload.groupIdx);
                }

                return newState;
            }
        };
    }

    sideEffects(state:WdglanceTilesState, action:Action, dispatch:SEDispatcher):void {
        switch (action.name) {
            case ActionName.GetCorpusInfo:
                this.corpusInfoApi.call(
                    {
                        corpname: action.payload['corpusId'],
                        format: 'json'
                    }
                ).subscribe(
                    (data) => {
                        dispatch<Actions.GetCorpusInfoDone>({
                            name: ActionName.GetCorpusInfoDone,
                            payload: {
                                data: data
                            }
                        })
                    },
                    (error) => {
                        this.appServices.showMessage(SystemMessageType.ERROR, error);
                        dispatch<Actions.GetCorpusInfoDone>({
                            name: ActionName.GetCorpusInfoDone,
                            error: error,
                            payload: {
                                data: null
                            }
                        })
                    }
                );
        }
    }
}