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
import { Action, SEDispatcher, StatelessModel, IActionQueue } from 'kombo';
import { Observable } from 'rxjs';
import { concatMap, map } from 'rxjs/operators';

import { AppServices } from '../appServices';
import { ajax$, ResponseType } from '../common/ajax';
import { SystemMessageType, SourceDetails } from '../common/types';
import { TileFrameProps } from '../common/tile';
import { ActionName, Actions } from './actions';
import { produce } from 'immer';
import { Listop, Transform } from 'montainer';



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

    constructor(dispatcher:IActionQueue, initialState:WdglanceTilesState, appServices:AppServices) {
        super(dispatcher, initialState);
        this.appServices = appServices;
        this.actionMatch = {
            [ActionName.SetScreenMode]: (state, action:Actions.SetScreenMode) => {
                const newState = this.copyState(state);
                newState.isMobile = action.payload.isMobile;
                return newState;
            },
            [ActionName.SetTileRenderSize]: produce((state:WdglanceTilesState, action:Actions.SetTileRenderSize) => {
                const srchId = state.tileProps.findIndex(v => v.tileId === action.payload.tileId);
                if (srchId > -1) {
                    const tile = state.tileProps[srchId];
                    state.tileProps = Listop.of(state.tileProps).set(
                        srchId,
                        {
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
                            supportsReloadOnError: tile.supportsReloadOnError
                        }
                    ).u();
                }
                return state;
            }),
            [ActionName.EnableAltViewMode]: produce((state, action:Actions.EnableAltViewMode) => {
                const newState = this.copyState(state);
                newState.altViewActiveTiles = Listop.of(newState.altViewActiveTiles).addUnique(action.payload.ident).unwrap();
                return newState;
            }),
            [ActionName.DisableAltViewMode]: (state, action:Actions.DisableAltViewMode) => {
                const newState = this.copyState(state);
                newState.altViewActiveTiles = Listop.of(newState.altViewActiveTiles).removeValue(action.payload.ident).unwrap();
                return newState;
            },
            [ActionName.EnableTileTweakMode]: (state, action:Actions.EnableTileTweakMode) => {
                const newState = this.copyState(state);
                newState.tweakActiveTiles = Listop.of(newState.tweakActiveTiles).addUnique(action.payload.ident).unwrap();
                return newState;
            },
            [ActionName.DisableTileTweakMode]: (state, action:Actions.DisableTileTweakMode) => {
                const newState = this.copyState(state);
                newState.tweakActiveTiles = Listop.of(newState.tweakActiveTiles).removeValue(action.payload.ident).unwrap();
                return newState;
            },
            [ActionName.ShowTileHelp]: (state, action:Actions.ShowTileHelp) => {
                const newState = this.copyState(state);
                newState.activeTileHelp = {ident: action.payload.tileId, html: null};
                newState.isBusy = true;
                return newState;
            },
            [ActionName.LoadTileHelpDone]: (state, action:Actions.LoadTileHelpDone) => {
                const newState = this.copyState(state);
                newState.isBusy = false;
                if (action.error) {
                    newState.activeTileHelp = null;

                } else {
                    newState.activeTileHelp = {ident: action.payload.tileId, html: action.payload.html};
                }
                return newState;
            },
            [ActionName.HideTileHelp]: (state, action:Actions.HideTileHelp) => {
                const newState = this.copyState(state);
                newState.activeTileHelp = null;
                return newState;
            },
            [ActionName.GetSourceInfo]: (state, action:Actions.GetSourceInfo) => {
                const newState = this.copyState(state);
                newState.activeSourceInfo = {
                    tileId: action.payload.tileId,
                    title: null,
                    description: null,
                    author: null
                };
                newState.isBusy = true;
                return newState;
            },
            [ActionName.GetSourceInfoDone]: (state, action:Actions.GetSourceInfoDone) => {
                const newState = this.copyState(state);
                newState.isBusy = false;
                if (action.error) {
                    newState.activeSourceInfo = null;

                } else {
                    newState.activeSourceInfo = action.payload.data;
                }
                return newState;
            },
            [ActionName.CloseSourceInfo]: (state, action:Actions.CloseSourceInfo) => {
                const newState = this.copyState(state);
                newState.activeSourceInfo = null;
                return newState;
            },
            [ActionName.ToggleGroupVisibility]: (state, action:Actions.ToggleGroupVisibility) => {
                const newState = this.copyState(state);
                if (newState.hiddenGroups.some(v => v === action.payload.groupIdx)) {
                    newState.hiddenGroups = Listop.of(newState.hiddenGroups).removeValue(action.payload.groupIdx).unwrap();

                } else {
                    newState.hiddenGroups = Listop.of(newState.hiddenGroups).addUnique(action.payload.groupIdx).unwrap();
                }

                return newState;
            },
            [ActionName.ShowGroupHelp]: (state, action:Actions.ShowGroupHelp) => {
                const newState = this.copyState(state);
                newState.isBusy = true;
                newState.activeGroupHelp = {html: '', idx: action.payload.groupIdx};
                return newState;
            },
            [ActionName.ShowGroupHelpDone]: (state, action:Actions.ShowGroupHelpDone) => {
                const newState = this.copyState(state);
                newState.isBusy = false;
                if (action.error) {
                    newState.activeGroupHelp = null;

                } else {
                    newState.activeGroupHelp = {html: action.payload.html, idx: action.payload.groupIdx};
                }
                return newState;
            },
            [ActionName.HideGroupHelp]: (state, action:Actions.HideGroupHelp) => {
                const newState = this.copyState(state);
                newState.activeGroupHelp = null;
                return newState;
            },
            [ActionName.RequestQueryResponse]: (state, action) => {
                const newState = this.copyState(state);
                newState.tileResultFlags = Listop.of(newState.tileResultFlags)
                    .map(v => ({
                        tileId: v.tileId,
                        groupId: v.groupId,
                        status: TileResultFlag.PENDING,
                        canBeAmbiguousResult: false
                    })).unwrap();
                newState.datalessGroups = [];
                return newState;
            },
            [ActionName.TileDataLoaded]: (state, action:Actions.TileDataLoaded<{}>) => {
                const newState = this.copyState(state);
                const srchIdx = newState.tileResultFlags.findIndex(v => v.tileId === action.payload.tileId);
                if (srchIdx > -1) {
                    const curr = newState.tileResultFlags[srchIdx];
                    newState.tileResultFlags = Listop.of(newState.tileResultFlags).set(srchIdx, {
                        tileId: curr.tileId,
                        groupId: curr.groupId,
                        status: this.inferResultFlag(action),
                        canBeAmbiguousResult: action.payload.canBeAmbiguousResult
                    }).unwrap();
                }
                if (this.allTileStatusFlagsWritten(newState)) {
                    this.findEmptyGroups(newState);
                }
                return newState;
            },
            [ActionName.SetEmptyResult]: (state, action) => {
                const newState = this.copyState(state);
                newState.tileResultFlags = Listop.of(newState.tileResultFlags)
                    .map(v => ({
                        tileId: v.tileId,
                        groupId: v.groupId,
                        status: TileResultFlag.EMPTY_RESULT,
                        canBeAmbiguousResult: false
                    })).unwrap();
                this.findEmptyGroups(newState);
                return newState;
            },
            [ActionName.ShowAmbiguousResultHelp]: (state, action) => {
                const newState = this.copyState(state);
                newState.showAmbiguousResultHelp = true;
                return newState;
            },
            [ActionName.HideAmbiguousResultHelp]: (state, action) => {
                const newState = this.copyState(state);
                newState.showAmbiguousResultHelp = false;
                return newState;
            }
        };
    }

    private allTileStatusFlagsWritten(state:WdglanceTilesState):boolean {
        return state.tileResultFlags.find(v => v.status === TileResultFlag.PENDING) === undefined;
    }

    private inferResultFlag(action:Actions.TileDataLoaded<{}>):TileResultFlag {
        if (action.error) {
            return TileResultFlag.ERROR;

        } else if (action.payload.isEmpty) {
            return TileResultFlag.EMPTY_RESULT;
        }
        return TileResultFlag.VALID_RESULT;
    }

    private findEmptyGroups(state:WdglanceTilesState):void {
        state.datalessGroups = Transform.groupBy(
                Listop.of(state.tileResultFlags),
                v => v.groupId.toString()
        )
        .map((v, _) => !v.find(v2 => v2.status !== TileResultFlag.EMPTY_RESULT))
        .filter(v => v)
        .keys()
        .map(v => parseInt(v))
        .u();
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

    sideEffects(state:WdglanceTilesState, action:Action, dispatch:SEDispatcher):void {
        switch (action.name) {
            case ActionName.ShowTileHelp:
                this.getTileProps(state, action.payload['tileId']).pipe(
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
            break;
            case ActionName.ShowGroupHelp:
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
            break;
            case ActionName.SetEmptyResult:
                if (action.payload && action.payload['error']) {
                    this.appServices.showMessage(SystemMessageType.ERROR, action.payload['error']);
                }
            break;
        }
    }
}