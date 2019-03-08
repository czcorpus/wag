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
import {Observable} from 'rxjs';
import {concatMap} from 'rxjs/operators';
import * as Immutable from 'immutable';
import { AppServices } from '../appServices';
import { TileFrameProps, SystemMessageType } from '../common/types';
import { CorpusInfoAPI, APIResponse as CorpusInfoResponse} from '../common/api/kontext/corpusInfo';
import { ajax$, ResponseType } from '../common/ajax';


export enum TileResultFlag {
    PENDING = 0,
    EMPTY_RESULT = 1,
    VALID_RESULT = 2
}

export interface TileResultFlagRec {
    tileId:number;
    groupId:number;
    status:TileResultFlag;
}


export interface WdglanceTilesState {
    isAnswerMode:boolean;
    isBusy:boolean;
    isMobile:boolean;
    isModalVisible:boolean;
    tweakActiveTiles:Immutable.Set<number>;
    helpActiveTiles:Immutable.Set<number>;
    tilesHelpData:Immutable.Map<number, string>; // raw html data loaded from a trusted resource
    hiddenGroups:Immutable.Set<number>;
    hiddenGroupsHeaders:Immutable.Set<number>;
    datalessGroups:Immutable.Set<number>;
    tileResultFlags:Immutable.List<TileResultFlagRec>;
    tileProps:Immutable.List<TileFrameProps>;
    modalBoxData:CorpusInfoResponse|null; // or other possible data types
    modalBoxTitle:string;
}


export class WdglanceTilesModel extends StatelessModel<WdglanceTilesState> {

    private readonly appServices:AppServices;

    private readonly corpusInfoApi:CorpusInfoAPI;

    constructor(dispatcher:ActionDispatcher, initialState:WdglanceTilesState, appServices:AppServices, corpusInfoApi:CorpusInfoAPI) {
        super(dispatcher, initialState);
        this.appServices = appServices;
        this.corpusInfoApi = corpusInfoApi;
        this.actionMatch = {
            [ActionName.SetScreenMode]: (state, action:Actions.SetScreenMode) => {
                const newState = this.copyState(state);
                newState.isMobile = action.payload.isMobile;
                return newState;
            },
            [ActionName.SetTileRenderSize]: (state, action:Actions.SetTileRenderSize) => {
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
                            supportsTweakMode: tile.supportsTweakMode,
                            supportsCurrQueryType: tile.supportsCurrQueryType,
                            renderSize: [action.payload.size[0] + tile.tileId, action.payload.size[1]],
                            widthFract: tile.widthFract,
                            supportsHelpView: tile.supportsHelpView,
                            helpURL: tile.helpURL
                        }
                    );
                    return newState;
                }
                return state;
            },
            [ActionName.EnableTileTweakMode]: (state, action:Actions.EnableTileTweakMode) => {
                const newState = this.copyState(state);
                newState.tweakActiveTiles = newState.tweakActiveTiles.add(action.payload.ident);
                return newState;
            },
            [ActionName.DisableTileTweakMode]: (state, action:Actions.DisableTileTweakMode) => {
                const newState = this.copyState(state);
                newState.tweakActiveTiles = newState.tweakActiveTiles.remove(action.payload.ident);
                return newState;
            },
            [ActionName.ShowTileHelp]: (state, action:Actions.ShowTileHelp) => {
                const newState = this.copyState(state);
                if (newState.tilesHelpData.has(action.payload.tileId)) {
                    newState.helpActiveTiles = newState.helpActiveTiles.add(action.payload.tileId);
                }
                return newState;
            },
            [ActionName.LoadTileHelpDone]: (state, action:Actions.LoadTileHelpDone) => {
                const newState = this.copyState(state);
                newState.tilesHelpData = newState.tilesHelpData.set(action.payload.tileId, action.payload.html);
                newState.helpActiveTiles = newState.helpActiveTiles.add(action.payload.tileId);
                return newState;
            },
            [ActionName.HideTileHelp]: (state, action:Actions.HideTileHelp) => {
                const newState = this.copyState(state);
                newState.helpActiveTiles = newState.helpActiveTiles.remove(action.payload.tileId);
                return newState;
            },
            [ActionName.DisableAnswerMode]: (state, action:Actions.DisableAnswerMode) => {
                const newState = this.copyState(state);
                newState.isAnswerMode = true;
                return newState;
            },
            [ActionName.GetCorpusInfo]: (state, action:Actions.GetCorpusInfo) => {
                const newState = this.copyState(state);
                newState.modalBoxData = null;
                newState.modalBoxTitle = null;
                newState.isModalVisible = true;
                newState.isBusy = true;
                return newState;
            },
            [ActionName.GetCorpusInfoDone]: (state, action:Actions.GetCorpusInfoDone) => {
                const newState = this.copyState(state);
                newState.isBusy = false;
                if (action.error) {
                    newState.isModalVisible = false;

                } else {
                    newState.modalBoxData = action.payload.data;
                    newState.modalBoxTitle = action.payload.data.corpname;
                }
                return newState;
            },
            [ActionName.CloseCorpusInfo]: (state, action:Actions.CloseCorpusInfo) => {
                const newState = this.copyState(state);
                newState.modalBoxData = null;
                newState.isModalVisible = false;
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
            },
            [ActionName.ToggleGroupHeader]: (state, action:Actions.ToggleGroupHeader) => {
                const newState = this.copyState(state);
                if (newState.hiddenGroupsHeaders.contains(action.payload.groupIdx)) {
                    newState.hiddenGroupsHeaders = newState.hiddenGroupsHeaders.remove(action.payload.groupIdx);

                } else {
                    newState.hiddenGroupsHeaders = newState.hiddenGroupsHeaders.add(action.payload.groupIdx);
                }
                return newState;
            },
            [ActionName.RequestQueryResponse]: (state, action) => {
                const newState = this.copyState(state);
                newState.tileResultFlags = newState.tileResultFlags.map(v => ({
                    tileId: v.tileId,
                    groupId: v.groupId,
                    status: TileResultFlag.PENDING
                })).toList();
                newState.datalessGroups = newState.datalessGroups.clear();
                return newState;
            },
            [ActionName.TileDataLoaded]: (state, action:Actions.TileDataLoaded<{}>) => {
                const newState = this.copyState(state);
                const srchIdx = newState.tileResultFlags.findIndex(v => v.tileId === action.payload.tileId);
                if (srchIdx > -1) {
                    const curr = newState.tileResultFlags.get(srchIdx);
                    newState.tileResultFlags = newState.tileResultFlags.set(srchIdx, {
                        tileId: curr.tileId,
                        groupId: curr.groupId,
                        status: action.payload.isEmpty ? TileResultFlag.EMPTY_RESULT : TileResultFlag.VALID_RESULT
                    });
                }
                if (this.allTileStatusFlagsWritten(newState)) {
                    this.findEmptyGroups(newState);
                }
                return newState;
            }
        };
    }

    private allTileStatusFlagsWritten(state:WdglanceTilesState):boolean {
        return state.tileResultFlags.find(v => v.status === TileResultFlag.PENDING) === undefined;
    }

    private findEmptyGroups(state:WdglanceTilesState):void {
        state.datalessGroups = Immutable.Set<number>(
            state.tileResultFlags
                .groupBy(v => v.groupId)
                .map<[number, boolean]>((v, i) => [i, !v.find(v2 => v2.status !== TileResultFlag.EMPTY_RESULT)])
                .filter(v => v[1])
                .map(v => v[0])
                .toList()
        );
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
            break;
            case ActionName.ShowTileHelp:
                if (!state.tilesHelpData.has(action.payload['tileId'])) {
                    new Observable<string>((observer) => {
                        if (state.tileProps.get(action.payload['tileId']).helpURL) {
                            observer.next(state.tileProps.get(action.payload['tileId']).helpURL);
                            observer.complete();

                        } else {
                            observer.error(new Error('Missing help URL'));
                        }

                    }).pipe(
                        concatMap(
                            (url) => {
                                return ajax$<string>(
                                    'GET',
                                    url,
                                    {},
                                    {
                                        responseType: ResponseType.TEXT
                                    }
                                );
                            }
                        )

                    ).subscribe(
                        (html) => {
                            dispatch<Actions.LoadTileHelpDone>({
                                name: ActionName.LoadTileHelpDone,
                                payload: {
                                    tileId: action.payload['tileId'],
                                    html: html
                                }
                            });
                        },
                        (err) => {
                            this.appServices.showMessage(SystemMessageType.ERROR, err);
                            dispatch<Actions.LoadTileHelpDone>({
                                name: ActionName.LoadTileHelpDone,
                                error: err,
                                payload: {
                                    tileId: action.payload['tileId'],
                                    html: null
                                }
                            });
                        }
                    );
                }
            break;
        }
    }
}