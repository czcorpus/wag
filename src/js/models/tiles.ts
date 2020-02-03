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
import { StatelessModel, IActionDispatcher } from 'kombo';
import { Observable } from 'rxjs';
import { concatMap, map } from 'rxjs/operators';

import { AppServices } from '../appServices';
import { ajax$, ResponseType } from '../common/ajax';
import { SystemMessageType, SourceDetails } from '../common/types';
import { TileFrameProps } from '../common/tile';
import { ActionName, Actions } from './actions';
import { List, Dict, applyComposed } from '../common/collections';



export enum TileResultFlag {
    PENDING = 0,
    EMPTY_RESULT = 1,
    VALID_RESULT = 2,
    ERROR = 3
}

export interface TileResultFlagRec {
    tileId:number;
    groupId:number;
    status:TileResultFlag;
    canBeAmbiguousResult:boolean;
}


export interface WdglanceTilesState {
    isAnswerMode:boolean;
    isBusy:boolean;
    isMobile:boolean;
    altViewActiveTiles:Array<number>;
    tweakActiveTiles:Array<number>;
    hiddenGroups:Array<number>;
    activeSourceInfo:SourceDetails|null;
    activeGroupHelp:{html:string; idx:number}|null;
    activeTileHelp:{html:string; ident:number}|null;
    showAmbiguousResultHelp:boolean;
    datalessGroups:Array<number>;
    tileResultFlags:Array<TileResultFlagRec>;
    tileProps:Array<TileFrameProps>;
}


export class WdglanceTilesModel extends StatelessModel<WdglanceTilesState> {

    private readonly appServices:AppServices;

    constructor(dispatcher:IActionDispatcher, initialState:WdglanceTilesState, appServices:AppServices) {
        super(dispatcher, initialState);
        this.appServices = appServices;
        this.addActionHandler<Actions.SetScreenMode>(
            ActionName.SetScreenMode,
            (state, action) => {
                state.isMobile = action.payload.isMobile;
            }
        );
        this.addActionHandler<Actions.SetTileRenderSize>(
            ActionName.SetTileRenderSize,
            (state, action) => {
                const srchId = state.tileProps.findIndex(v => v.tileId === action.payload.tileId);
                if (srchId > -1) {
                    const tile = state.tileProps[srchId];
                    state.tileProps[srchId] = {
                        tileId: tile.tileId,
                        tileName: tile.tileName,
                        Component: tile.Component,
                        SourceInfoComponent: tile.SourceInfoComponent,
                        label: tile.label,
                        supportsTweakMode: tile.supportsTweakMode,
                        supportsCurrQuery: tile.supportsCurrQuery,
                        supportsHelpView: tile.supportsHelpView,
                        supportsAltView: tile.supportsAltView,
                        renderSize: [action.payload.size[0] + tile.tileId, action.payload.size[1]],
                        widthFract: tile.widthFract,
                        maxTileHeight: tile.maxTileHeight,
                        helpURL: tile.helpURL,
                        supportsReloadOnError: tile.supportsReloadOnError,
                        issueReportingUrl: tile.issueReportingUrl
                    }
                };
            }
        );
        this.addActionHandler<Actions.EnableAltViewMode>(
            ActionName.EnableAltViewMode,
            (state, action) => {
                state.altViewActiveTiles = List.addUnique(action.payload.ident, state.altViewActiveTiles);
            }
        );
        this.addActionHandler<Actions.DisableAltViewMode>(
            ActionName.DisableAltViewMode,
            (state, action) => {
                state.altViewActiveTiles = List.removeValue(action.payload.ident, state.altViewActiveTiles);
            }
        );
        this.addActionHandler<Actions.EnableTileTweakMode>(
            ActionName.EnableTileTweakMode,
            (state, action) => {
                state.tweakActiveTiles = List.addUnique(action.payload.ident, state.tweakActiveTiles);
            }
        );
        this.addActionHandler<Actions.DisableTileTweakMode>(
            ActionName.DisableTileTweakMode,
            (state, action) => {
                state.tweakActiveTiles = List.removeValue(action.payload.ident, state.tweakActiveTiles);
            }
        );
        this.addActionHandler<Actions.ShowTileHelp>(
            ActionName.ShowTileHelp,
            (state, action) => {
                state.activeTileHelp = {ident: action.payload.tileId, html: null};
                state.isBusy = true;
            },
            (state, action, dispatch) => {
                this.getTileProps(state, action.payload.tileId).pipe(
                    map(
                        (props) => {
                            if (!props.helpURL) {
                                throw new Error('Missing help URL');
                            }
                            return props.helpURL;
                        }
                    ),
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
        );
        this.addActionHandler<Actions.LoadTileHelpDone>(
            ActionName.LoadTileHelpDone,
            (state, action) => {
                state.isBusy = false;
                if (action.error) {
                    state.activeTileHelp = null;

                } else {
                    state.activeTileHelp = {ident: action.payload.tileId, html: action.payload.html};
                }
            }
        );
        this.addActionHandler<Actions.HideTileHelp>(
            ActionName.HideTileHelp,
            (state, action) => {
                state.activeTileHelp = null;
            }
        );
        this.addActionHandler<Actions.GetSourceInfo>(
            ActionName.GetSourceInfo,
            (state, action) => {
                state.activeSourceInfo = {
                    tileId: action.payload.tileId,
                    title: null,
                    description: null,
                    author: null
                };
                state.isBusy = true;
            }
        );
        this.addActionHandler<Actions.GetSourceInfoDone>(
            ActionName.GetSourceInfoDone,
            (state, action) => {
                state.isBusy = false;
                if (action.error) {
                    state.activeSourceInfo = null;

                } else {
                    state.activeSourceInfo = action.payload.data;
                }
            }
        );
        this.addActionHandler<Actions.CloseSourceInfo>(
            ActionName.CloseSourceInfo,
            (state, action) => {
                state.activeSourceInfo = null;
            }
        );
        this.addActionHandler<Actions.ToggleGroupVisibility>(
            ActionName.ToggleGroupVisibility,
            (state, action) => {
                if (state.hiddenGroups.some(v => v === action.payload.groupIdx)) {
                    state.hiddenGroups = List.removeValue(action.payload.groupIdx, state.hiddenGroups);

                } else {
                    state.hiddenGroups = List.addUnique(action.payload.groupIdx, state.hiddenGroups);
                }
            }
        );
        this.addActionHandler<Actions.ShowGroupHelp>(
            ActionName.ShowGroupHelp,
            (state, action) => {
                state.isBusy = true;
                state.activeGroupHelp = {html: '', idx: action.payload.groupIdx};
            },
            (state, action, dispatch) => {
                ajax$<string>(
                    'GET',
                    action.payload['url'],
                    {},
                    {
                        responseType: ResponseType.TEXT
                    }
                ).subscribe(
                    (html) => {
                        dispatch<Actions.ShowGroupHelpDone>({
                            name: ActionName.ShowGroupHelpDone,
                            payload: {
                                html: html,
                                groupIdx: action.payload['groupIdx']
                            }
                        });
                    },
                    (err) => {
                        this.appServices.showMessage(SystemMessageType.ERROR, err);
                        dispatch<Actions.ShowGroupHelpDone>({
                            name: ActionName.ShowGroupHelpDone,
                            error: err,
                            payload: {
                                html: null,
                                groupIdx: -1
                            }
                        });
                    }
                );
            }
        );
        this.addActionHandler<Actions.ShowGroupHelpDone>(
            ActionName.ShowGroupHelpDone,
            (state, action) => {
                state.isBusy = false;
                if (action.error) {
                    state.activeGroupHelp = null;

                } else {
                    state.activeGroupHelp = {html: action.payload.html, idx: action.payload.groupIdx};
                }
            }
        );
        this.addActionHandler<Actions.HideGroupHelp>(
            ActionName.HideGroupHelp,
            (state, action) => {
                state.activeGroupHelp = null;
            }
        );
        this.addActionHandler(
            ActionName.RequestQueryResponse,
            (state, action) => {
                state.tileResultFlags = List.map(
                    v => ({
                        tileId: v.tileId,
                        groupId: v.groupId,
                        status: TileResultFlag.PENDING,
                        canBeAmbiguousResult: false
                    }),
                    state.tileResultFlags
                );
                state.datalessGroups = [];
            }
        );
        this.addActionHandler<Actions.TileDataLoaded<{}>>(
            ActionName.TileDataLoaded,
            (state, action) => {
                const srchIdx = state.tileResultFlags.findIndex(v => v.tileId === action.payload.tileId);
                if (srchIdx > -1) {
                    const curr = state.tileResultFlags[srchIdx];
                    state.tileResultFlags[srchIdx] = {
                        tileId: curr.tileId,
                        groupId: curr.groupId,
                        status: this.inferResultFlag(action),
                        canBeAmbiguousResult: action.payload.canBeAmbiguousResult
                    };
                }
                if (this.allTileStatusFlagsWritten(state)) {
                    this.findEmptyGroups(state);
                }
            }
        );
        this.addActionHandler<Actions.SetEmptyResult>(
            ActionName.SetEmptyResult,
            (state, action) => {
                state.tileResultFlags = state.tileResultFlags
                    .map(v => ({
                        tileId: v.tileId,
                        groupId: v.groupId,
                        status: TileResultFlag.EMPTY_RESULT,
                        canBeAmbiguousResult: false
                    }));
                this.findEmptyGroups(state);
                return state;
            },
            (state, action, dispatch) => {
                if (action.payload && action.payload.error) {
                    this.appServices.showMessage(SystemMessageType.ERROR, action.payload.error);
                }
            }
        );
        this.addActionHandler(
            ActionName.ShowAmbiguousResultHelp,
            (state, action) => {
                state.showAmbiguousResultHelp = true;
                return state;
            }
        );
        this.addActionHandler(
            ActionName.HideAmbiguousResultHelp,
            (state, action) => {
                state.showAmbiguousResultHelp = false;
            }
        );
    }

    private allTileStatusFlagsWritten(state:WdglanceTilesState):boolean {
        return List.find(v => v.status === TileResultFlag.PENDING, state.tileResultFlags) === undefined;
    }

    private inferResultFlag(action:Actions.TileDataLoaded<{}>):TileResultFlag {
        if (action.error) {
            return TileResultFlag.ERROR;

        } else if (action.payload.isEmpty) {
            return TileResultFlag.EMPTY_RESULT;
        }
        return TileResultFlag.VALID_RESULT;
    }

    private findEmptyGroups(state:WdglanceTilesState):void { // TODO
        state.datalessGroups = applyComposed(
            state.tileResultFlags,
            List.groupBy(v => v.groupId.toString()),
            Dict.fromEntries(),
            Dict.map((v, _) => List.every(t => t.status === TileResultFlag.EMPTY_RESULT, v)),
            Dict.filter((v, _) => !!v),
            Dict.keys(),
            List.map(v => parseInt(v))
        );
    }

    private getTileProps(state:WdglanceTilesState, tileId:number):Observable<TileFrameProps> {
        return new Observable<TileFrameProps>((observer) => {
            if (state.tileProps[tileId]) {
                observer.next(state.tileProps[tileId]);
                observer.complete();

            } else {
                observer.error(new Error('Missing help URL'));
            }
        });
    }
}