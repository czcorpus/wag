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
import { StatelessModel, IActionDispatcher, SEDispatcher } from 'kombo';
import { Observable, interval, of as rxOf } from 'rxjs';
import { concatMap, map, take } from 'rxjs/operators';

import { IAppServices } from '../appServices';
import { ajax$, ResponseType } from '../page/ajax';
import { SystemMessageType, SourceDetails } from '../types';
import { TileFrameProps } from '../page/tile';
import { Actions } from './actions';
import { List, Dict, pipe } from 'cnc-tskit';



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
    maxTileErrors:number;
    numTileErrors:number;
    issueReportingUrl:string|null;
    highlightedTileId:number;
    scrollToTileId:number;
    allTilesLoaded:boolean;
}

/**
 *
 * Blink a tile highlighting shadow several times and finish
 * with highlight status disabled. If appendTo Observable is
 * provided then the action is chanied to it.
 */
export function blinkAndDehighlight(tileId:number, someDispatcher:SEDispatcher|IActionDispatcher, appendTo?:Observable<any>):void {
    const dispatch = typeof someDispatcher === 'function' ? someDispatcher : someDispatcher.dispatch;
    (appendTo ? appendTo : rxOf(null)).pipe(
        concatMap(() => interval(100)),
        take(13)
    ).subscribe(
        v => {
            if (v % 2 == 1 || v < 6) {
                dispatch<typeof Actions.HighlightTile>({
                    name: Actions.HighlightTile.name,
                    payload: {
                        tileId: tileId
                    }
                });

            } else {
                dispatch<typeof Actions.DehighlightTile>({
                    name: Actions.DehighlightTile.name,
                    payload: {
                        tileId: tileId
                    }
                });
            }
        },
        err => {},
        () => {
            dispatch<typeof Actions.DehighlightTile>({
                name: Actions.DehighlightTile.name,
                payload: {
                    tileId: tileId
                }
            });
        }
    );
}

/**
 * General tile model handling common tile actions.
 */
export class WdglanceTilesModel extends StatelessModel<WdglanceTilesState> {

    private readonly appServices:IAppServices;

    constructor(dispatcher:IActionDispatcher, initialState:WdglanceTilesState, appServices:IAppServices) {
        super(dispatcher, initialState);
        this.appServices = appServices;
        this.addActionHandler<typeof Actions.SetScreenMode>(
            Actions.SetScreenMode.name,
            (state, action) => {
                state.isMobile = action.payload.isMobile;
            }
        );
        this.addActionHandler<typeof Actions.SetTileRenderSize>(
            Actions.SetTileRenderSize.name,
            (state, action) => {
                const srchId = List.findIndex(v => v.tileId === action.payload.tileId, state.tileProps);
                if (srchId > -1) {
                    const tile = state.tileProps[srchId];
                    state.tileProps[srchId] = {...tile, renderSize: [action.payload.size[0] + tile.tileId, action.payload.size[1]]};
                };
            }
        );
        this.addActionHandler<typeof Actions.EnableAltViewMode>(
            Actions.EnableAltViewMode.name,
            (state, action) => {
                state.altViewActiveTiles = List.addUnique(action.payload.ident, state.altViewActiveTiles);
            }
        );
        this.addActionHandler<typeof Actions.DisableAltViewMode>(
            Actions.DisableAltViewMode.name,
            (state, action) => {
                state.altViewActiveTiles = List.removeValue(action.payload.ident, state.altViewActiveTiles);
            }
        );
        this.addActionHandler<typeof Actions.EnableTileTweakMode>(
            Actions.EnableTileTweakMode.name,
            (state, action) => {
                state.tweakActiveTiles = List.addUnique(action.payload.ident, state.tweakActiveTiles);
            }
        );
        this.addActionHandler<typeof Actions.DisableTileTweakMode>(
            Actions.DisableTileTweakMode.name,
            (state, action) => {
                state.tweakActiveTiles = List.removeValue(action.payload.ident, state.tweakActiveTiles);
            }
        );
        this.addActionHandler<typeof Actions.ShowTileHelp>(
            Actions.ShowTileHelp.name,
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
                        dispatch<typeof Actions.LoadTileHelpDone>({
                            name: Actions.LoadTileHelpDone.name,
                            payload: {
                                tileId: action.payload['tileId'],
                                html: html
                            }
                        });
                    },
                    (err) => {
                        this.appServices.showMessage(SystemMessageType.ERROR, err);
                        dispatch<typeof Actions.LoadTileHelpDone>({
                            name: Actions.LoadTileHelpDone.name,
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
        this.addActionHandler<typeof Actions.LoadTileHelpDone>(
            Actions.LoadTileHelpDone.name,
            (state, action) => {
                state.isBusy = false;
                if (action.error) {
                    state.activeTileHelp = null;

                } else {
                    state.activeTileHelp = {ident: action.payload.tileId, html: action.payload.html};
                }
            }
        );
        this.addActionHandler<typeof Actions.HideTileHelp>(
            Actions.HideTileHelp.name,
            (state, action) => {
                state.activeTileHelp = null;
            }
        );
        this.addActionHandler<typeof Actions.GetSourceInfo>(
            Actions.GetSourceInfo.name,
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
        this.addActionHandler<typeof Actions.GetSourceInfoDone>(
            Actions.GetSourceInfoDone.name,
            (state, action) => {
                state.isBusy = false;
                if (action.error) {
                    state.activeSourceInfo = null;

                } else {
                    state.activeSourceInfo = action.payload.data;
                }
            }
        );
        this.addActionHandler<typeof Actions.CloseSourceInfo>(
            Actions.CloseSourceInfo.name,
            (state, action) => {
                state.activeSourceInfo = null;
            }
        );
        this.addActionHandler<typeof Actions.ToggleGroupVisibility>(
            Actions.ToggleGroupVisibility.name,
            (state, action) => {
                state.highlightedTileId = -1;
                state.scrollToTileId = -1;
                state.hiddenGroups =
                        List.some(v => v === action.payload.groupIdx, state.hiddenGroups) ?
                        List.removeValue(action.payload.groupIdx, state.hiddenGroups) :
                        List.addUnique(action.payload.groupIdx, state.hiddenGroups);
            }
        );
        this.addActionHandler<typeof Actions.OpenGroupAndHighlightTile>(
            Actions.OpenGroupAndHighlightTile.name,
            (state, action) => {
                List.removeValue(action.payload.groupIdx, state.hiddenGroups);
            },
            (state, action, dispatch) => {
                blinkAndDehighlight(action.payload.tileId, dispatch);
            }
        );
        this.addActionHandler<typeof Actions.HighlightTile>(
            Actions.HighlightTile.name,
            (state, action) => {
                state.highlightedTileId = action.payload.tileId;
            }
        );
        this.addActionHandler<typeof Actions.DehighlightTile>(
            Actions.DehighlightTile.name,
            (state, action) => {
                state.highlightedTileId = -1;
                state.scrollToTileId = -1;
            }
        );
        this.addActionHandler<typeof Actions.ShowGroupHelp>(
            Actions.ShowGroupHelp.name,
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
                        dispatch<typeof Actions.ShowGroupHelpDone>({
                            name: Actions.ShowGroupHelpDone.name,
                            payload: {
                                html: html,
                                groupIdx: action.payload['groupIdx']
                            }
                        });
                    },
                    (err) => {
                        this.appServices.showMessage(SystemMessageType.ERROR, err);
                        dispatch<typeof Actions.ShowGroupHelpDone>({
                            name: Actions.ShowGroupHelpDone.name,
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
        this.addActionHandler<typeof Actions.ShowGroupHelpDone>(
            Actions.ShowGroupHelpDone.name,
            (state, action) => {
                state.isBusy = false;
                if (action.error) {
                    state.activeGroupHelp = null;

                } else {
                    state.activeGroupHelp = {html: action.payload.html, idx: action.payload.groupIdx};
                }
            }
        );
        this.addActionHandler<typeof Actions.HideGroupHelp>(
            Actions.HideGroupHelp.name,
            (state, action) => {
                state.activeGroupHelp = null;
            }
        );
        this.addActionHandler<typeof Actions.RequestQueryResponse>(
            Actions.RequestQueryResponse.name,
            (state, action) => {
                if (action.payload?.focusedTile) {
                    const scrollToTile = List.find(v => v.tileName === action.payload.focusedTile, state.tileProps);
                    if (scrollToTile) {
                        state.scrollToTileId = scrollToTile.tileId;
                        state.highlightedTileId = scrollToTile.tileId;
                    }
                }
                state.allTilesLoaded = false;
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
        this.addActionHandler<typeof Actions.TileDataLoaded>(
            Actions.TileDataLoaded.name,
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
                if (this.allTileStatusFlagsWritten(state)) { // to make sure we don't react to a particular load misusing TileDataLoaded
                    state.allTilesLoaded = true;
                    this.findEmptyGroups(state);
                }
                state.numTileErrors = List.foldl(
                    (acc, v) => v.status === TileResultFlag.ERROR ? acc + 1 : acc,
                    0,
                    state.tileResultFlags
                );
            }
        );
        this.addActionHandler<typeof Actions.SetEmptyResult>(
            Actions.SetEmptyResult.name,
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
                    this.appServices.showMessage(SystemMessageType.ERROR, action.payload.error[1]);
                }
            }
        );
        this.addActionHandler<typeof Actions.ShowAmbiguousResultHelp>(
            Actions.ShowAmbiguousResultHelp.name,
            (state, action) => {
                state.showAmbiguousResultHelp = true;
                return state;
            }
        );
        this.addActionHandler<typeof Actions.HideAmbiguousResultHelp>(
            Actions.HideAmbiguousResultHelp.name,
            (state, action) => {
                state.showAmbiguousResultHelp = false;
            }
        );
    }

    private allTileStatusFlagsWritten(state:WdglanceTilesState):boolean {
        return List.find(v => v.status === TileResultFlag.PENDING, state.tileResultFlags) === undefined;
    }

    private inferResultFlag(action:typeof Actions.TileDataLoaded):TileResultFlag {
        if (action.error) {
            return TileResultFlag.ERROR;

        } else if (action.payload.isEmpty) {
            return TileResultFlag.EMPTY_RESULT;
        }
        return TileResultFlag.VALID_RESULT;
    }

    private findEmptyGroups(state:WdglanceTilesState):void {
        state.datalessGroups = pipe(
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