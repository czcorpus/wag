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
import { StatelessModel, IActionDispatcher, SEDispatcher, Action } from 'kombo';
import * as Immutable from 'immutable';

import { WdglanceMainFormModel } from '../../models/query';
import { AppServices } from '../../appServices';
import { Backlink } from '../../common/tile';
import { ActionName as GlobalActionName, Actions as GlobalActions } from '../../models/actions';
import { SpeechDataPayload } from './actions';
import { isSubqueryPayload } from '../../common/query';
import { SpeechesApi, SpeechReqArgs } from './api';
import { SpeechesModelState, extractSpeeches, Expand } from './modelDomain';
import { DataApi } from '../../common/types';
import { ActionName, Actions } from './actions';



export interface SpeechesModelArgs {
    dispatcher:IActionDispatcher;
    tileId:number;
    waitForTile:number;
    appServices:AppServices;
    api:SpeechesApi;
    sourceInfoService:DataApi<{}, {}>;
    mainForm:WdglanceMainFormModel;
    initState:SpeechesModelState;
    backlink:Backlink;
}


export class SpeechesModel extends StatelessModel<SpeechesModelState> {

    private readonly api:SpeechesApi;

    private readonly sourceInfoService:DataApi<{}, {}>;

    private readonly appServices:AppServices;

    private readonly tileId:number;

    private readonly backlink:Backlink;

    private readonly waitForTile:number;

    constructor({dispatcher, tileId, appServices, api, sourceInfoService, initState, waitForTile, backlink}:SpeechesModelArgs) {
        super(dispatcher, initState);
        this.api = api;
        this.sourceInfoService = sourceInfoService;
        this.appServices = appServices;
        this.tileId = tileId;
        this.backlink = backlink;
        this.waitForTile = waitForTile;
        this.actionMatch = {
            [GlobalActionName.RequestQueryResponse]: (state, action) => {
                const newState = this.copyState(state);
                newState.isBusy = true;
                newState.error = null;
                newState.concId = null;
                newState.tokenIdx = 0;
                return newState;
            },
            [GlobalActionName.TileDataLoaded]: (state, action:GlobalActions.TileDataLoaded<SpeechDataPayload>) => {
                if (action.payload.tileId === this.tileId) {
                    const newState = this.copyState(state);
                    newState.isBusy = false;
                    if (action.error) {
                        newState.error = action.error.message;

                    } else {
                        newState.data = action.payload.data;
                        if (action.payload.availableTokens) {
                            newState.availTokens = Immutable.List<number>(action.payload.availableTokens);
                        }
                        if (action.payload.expandLeftArgs) {
                            newState.expandLeftArgs = newState.expandLeftArgs.push({
                                leftCtx: action.payload.expandLeftArgs.leftCtx,
                                rightCtx: action.payload.expandLeftArgs.rightCtx
                            });

                        } else {
                            newState.expandLeftArgs = newState.expandLeftArgs.push(null);
                        }
                        if (action.payload.expandRightArgs) {
                            newState.expandRightArgs = newState.expandRightArgs.push({
                                leftCtx: action.payload.expandRightArgs.leftCtx,
                                rightCtx: action.payload.expandRightArgs.rightCtx
                            });

                        } else {
                            newState.expandRightArgs = newState.expandRightArgs.push(null);
                        }
                    }
                    return newState;
                }
                return state;
            },
            [GlobalActionName.EnableTileTweakMode]: (state, action:GlobalActions.EnableTileTweakMode) => {
                if (action.payload.ident === this.tileId) {
                    const newState = this.copyState(state);
                    newState.isTweakMode = true;
                    return newState;
                }
                return state;
            },
            [GlobalActionName.DisableTileTweakMode]: (state, action:GlobalActions.DisableTileTweakMode) => {
                if (action.payload.ident === this.tileId) {
                    const newState = this.copyState(state);
                    newState.isTweakMode = false;
                    return newState;
                }
                return state;
            },
            [ActionName.ExpandSpeech]: (state, action:Actions.ExpandSpeech) => {
                if (action.payload.tileId === this.tileId) {
                    const newState = this.copyState(state);
                    newState.isBusy = true;
                    return newState;
                }
                return state;
            },
            [ActionName.LoadAnotherSpeech]: (state, action:Actions.LoadAnotherSpeech) => {
                if (action.payload.tileId === this.tileId) {
                    const newState = this.copyState(state);
                    newState.isBusy = true;
                    newState.speakerColorsAttachments = newState.speakerColorsAttachments.clear();
                    newState.tokenIdx = (newState.tokenIdx + 1) % newState.availTokens.size;
                    return newState;
                }
                return state;
            }
        };
    }

    private createArgs(state:SpeechesModelState, pos:number, expand:Expand):SpeechReqArgs {
        const kwicLength = 1; // TODO
        const args:SpeechReqArgs = {
            attrs: 'word',
            attr_allpos: 'all',
            ctxattrs: 'word',
            corpname: state.corpname,
            pos: pos,
            structs: `${state.speakerIdAttr[0]}.${state.speakerIdAttr[1]},${state.speechOverlapAttr[0]}.${state.speechOverlapAttr[1]}`,
            format: 'json'
        };

        if (kwicLength > 1) {
            args.hitlen = kwicLength;
        }

        if (expand === Expand.TOP) {
            args.detail_left_ctx = state.expandLeftArgs.get(-1).leftCtx;
            args.detail_right_ctx = state.expandLeftArgs.get(-1).rightCtx;

        } else if (expand === Expand.BOTTOM) {
            args.detail_left_ctx = state.expandRightArgs.get(-1).leftCtx;
            args.detail_right_ctx = state.expandRightArgs.get(-1).rightCtx;

        } else if (expand === Expand.RELOAD && state.expandLeftArgs.size > 1
                && state.expandRightArgs.size > 1) {
            args.detail_left_ctx = state.expandRightArgs.get(-1).leftCtx;
            args.detail_right_ctx = state.expandLeftArgs.get(-1).rightCtx;
        }

        return args;
    }

    private reloadData(state:SpeechesModelState, dispatch:SEDispatcher, tokens:Array<number>, expand?:Expand):void {
        this.api.call(this.createArgs(state, (tokens || state.availTokens.toArray())[state.tokenIdx], expand))
        .subscribe(
            (data) => {
                dispatch<GlobalActions.TileDataLoaded<SpeechDataPayload>>({
                    name: GlobalActionName.TileDataLoaded,
                    payload: {
                        tileId: this.tileId,
                        availableTokens: tokens,
                        isEmpty: data.content.length === 0,
                        data: extractSpeeches(state, data.content),
                        expandLeftArgs: data.expand_left_args ?
                            {
                                leftCtx: data.expand_left_args.detail_left_ctx,
                                rightCtx: data.expand_left_args.detail_right_ctx,
                                pos: data.expand_left_args.pos
                            } : null,
                        expandRightArgs: data.expand_right_args ?
                            {
                                leftCtx: data.expand_right_args.detail_left_ctx,
                                rightCtx: data.expand_right_args.detail_right_ctx,
                                pos: data.expand_right_args.pos
                            } : null
                    }
                });
            },
            (err) => {
                console.error(err);
                dispatch<GlobalActions.TileDataLoaded<SpeechDataPayload>>({
                    name: GlobalActionName.TileDataLoaded,
                    error: err,
                    payload: {
                        tileId: this.tileId,
                        availableTokens: [],
                        isEmpty: true,
                        data: null,
                        expandLeftArgs: null,
                        expandRightArgs: null
                    }
                });
            }
        );
    }


    sideEffects(state:SpeechesModelState, action:Action, dispatch:SEDispatcher):void {
        switch(action.name) {
            case GlobalActionName.RequestQueryResponse:
                if (this.waitForTile) {
                    this.suspend(
                        (action) => {
                            if (action.name === GlobalActionName.TileDataLoaded && action.payload['tileId'] === this.waitForTile) {
                                if (isSubqueryPayload(action.payload)) {
                                    this.reloadData(
                                        state,
                                        dispatch,
                                        action.payload.subqueries.map(v => parseInt(v.value))
                                    );

                                } else {
                                    this.reloadData(state, dispatch, null);
                                }
                                return true;
                            }
                            return false;
                        }
                    );
                } else {
                    this.reloadData(state, dispatch, null);
                }
            break;
            case ActionName.ExpandSpeech:
                if (action.payload['tileId'] === this.tileId) {
                    this.reloadData(state, dispatch, null, action.payload['position']);
                }
            break;
            case ActionName.LoadAnotherSpeech:
                if (action.payload['tileId'] === this.tileId) {
                    this.reloadData(state, dispatch, null, Expand.RELOAD);
                }
            break;
        }
    }

}