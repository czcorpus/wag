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
import { StatelessModel, SEDispatcher, Action, IActionQueue } from 'kombo';
import { map } from 'rxjs/operators';
import * as Immutable from 'immutable';

import { AppServices } from '../../../appServices';
import { Backlink, BacklinkWithArgs } from '../../../common/tile';
import { ActionName as GlobalActionName, Actions as GlobalActions } from '../../../models/actions';
import { SpeechDataPayload } from './actions';
import { isSubqueryPayload } from '../../../common/query';
import { SpeechesApi, SpeechReqArgs, SpeechResponse } from './api';
import { SpeechesModelState, extractSpeeches, Expand, BacklinkArgs, Segment, PlayableSegment, normalizeSpeechesRange } from './modelDomain';
import { HTTPMethod, SystemMessageType } from '../../../common/types';
import { ActionName, Actions } from './actions';
import { isConcLoadedPayload } from '../concordance/actions';
import { normalizeConcDetailTypography } from '../../../common/models/concordance/normalize';
import { IAudioUrlGenerator } from '../../../common/api/abstract/audio';
import { AudioPlayer } from '../../../common/audioPlayer';



export interface SpeechesModelArgs {
    dispatcher:IActionQueue;
    tileId:number;
    waitForTile:number;
    appServices:AppServices;
    api:SpeechesApi;
    initState:SpeechesModelState;
    backlink:Backlink;
    audioLinkGenerator:IAudioUrlGenerator;
}


export class SpeechesModel extends StatelessModel<SpeechesModelState> {

    private readonly api:SpeechesApi;

    private readonly appServices:AppServices;

    private readonly tileId:number;

    private readonly backlink:Backlink;

    private readonly waitForTile:number;

    private readonly audioLinkGenerator:IAudioUrlGenerator|null;

    constructor({dispatcher, tileId, appServices, api, initState, waitForTile, backlink,
                audioLinkGenerator}:SpeechesModelArgs) {
        super(dispatcher, initState);
        this.api = api;
        this.appServices = appServices;
        this.tileId = tileId;
        this.backlink = backlink;
        this.waitForTile = waitForTile;
        this.audioLinkGenerator = audioLinkGenerator;
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
                        if (action.payload.concId !== null) {
                            newState.concId = action.payload.concId;
                        }
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
                        newState.backlink = this.createBackLink(newState);
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
                    newState.expandLeftArgs = newState.expandLeftArgs.clear();
                    newState.expandRightArgs = newState.expandRightArgs.clear();
                    newState.tokenIdx = (newState.tokenIdx + 1) % newState.availTokens.size;
                    return newState;
                }
                return state;
            },
            [ActionName.ClickAudioPlayer]: (state, action:Actions.ClickAudioPlayer) => {
                if (action.payload.tileId === this.tileId) {
                    const newState = this.copyState(state);
                    newState.playback = {
                        segments: Immutable.List<Segment>(action.payload.segments),
                        currLineIdx: newState.playback ? newState.playback.currLineIdx : null,
                        newLineIdx: action.payload.lineIdx,
                        currPlaybackSession: newState.playback ? newState.playback.currPlaybackSession : null,
                        newPlaybackSession: null
                    };
                    return newState;
                }
                return state;
            },
            [ActionName.ClickAudioPlayAll]: (state, action:Actions.ClickAudioPlayAll) => {
                if (action.payload.tileId === this.tileId) {
                    const newState = this.copyState(state);
                    const segments = state.data.reduce(
                        (acc, curr) => acc.concat(curr),
                        []
                    ).reduce(
                        (acc, curr) => acc.concat(curr.segments),
                        Immutable.List<Segment>()
                    ).toList();
                    newState.playback = {
                        segments: segments,
                        currLineIdx: newState.playback ? newState.playback.currLineIdx : null,
                        newLineIdx: segments.get(0).lineIdx,
                        currPlaybackSession: newState.playback ? newState.playback.currPlaybackSession : null,
                        newPlaybackSession: null
                    };
                    return newState;
                }
                return state;
            },
            [ActionName.AudioPlayerStarted]: (state, action:Actions.AudioPlayerStarted) => {
                if (action.payload.tileId === this.tileId) {
                    const newState = this.copyState(state);
                    newState.playback = {
                        segments: newState.playback.segments,
                        currLineIdx: newState.playback.newLineIdx,
                        newLineIdx: null,
                        currPlaybackSession: action.payload.playbackSession,
                        newPlaybackSession: null
                    };
                    return newState;
                }
                return state;
            },
            [ActionName.AudioPlayerStopped]: (state, action:Actions.AudioPlayerStopped) => {
                if (action.payload.tileId === this.tileId) {
                    const newState = this.copyState(state);
                    newState.playback = null;
                    return newState;
                }
                return state;
            },
            [ActionName.PlayedLineChanged]: (state, action:Actions.PlayedLineChanged) => {
                if (action.payload.tileId === this.tileId) {
                    const newState = this.copyState(state);
                    newState.playback = {
                        currLineIdx: action.payload.lineIdx,
                        newLineIdx: null,
                        segments: newState.playback.segments,
                        newPlaybackSession: newState.playback.newPlaybackSession,
                        currPlaybackSession: newState.playback.currPlaybackSession
                    };
                    return newState;
                }
                return state;
            }
        };
    }

    private normalizeSegments(segments:Immutable.List<Segment>, corpname:string):Array<PlayableSegment> {
        return segments
            .groupBy(seg => seg.value) // solving multiple speaking people at the same time
            .map(v => v.get(0))
            .map(v => ({
                lineIdx: v.lineIdx,
                url: this.audioLinkGenerator.createUrl(corpname, v.value)

            }))
            .toArray();
    }

    private createArgs(state:SpeechesModelState, pos:number, expand:Expand):SpeechReqArgs {
        const kwicLength = 1; // TODO
        const args:SpeechReqArgs = {
            attrs: 'word',
            attr_allpos: 'all',
            ctxattrs: 'word',
            corpname: state.corpname,
            pos: pos,
            structs: [
                state.speakerIdAttr[0] + '.' + state.speakerIdAttr[1],
                state.speechOverlapAttr[0] + '.' + state.speechOverlapAttr[1],
                state.speechSegment[0] + '.' + state.speechSegment[1]
            ].join(','),
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

    private reloadData(state:SpeechesModelState, dispatch:SEDispatcher, tokens:Array<number>|null, concId:string|null, expand?:Expand):void {
        this.api
            .call(this.createArgs(state, (tokens || state.availTokens.toArray())[state.tokenIdx], expand))
            .pipe(
                map<SpeechResponse, SpeechDataPayload>(
                    (resp) => {
                        const data = normalizeSpeechesRange(
                            extractSpeeches(state, normalizeConcDetailTypography(resp.content)),
                            state.maxNumSpeeches);
                        return {
                            tileId: this.tileId,
                            concId: concId,
                            availableTokens: tokens,
                            isEmpty: resp.content.length === 0,
                            data: data,
                            expandLeftArgs: resp.expand_left_args ?
                                {
                                    leftCtx: resp.expand_left_args.detail_left_ctx,
                                    rightCtx: resp.expand_left_args.detail_right_ctx,
                                    pos: resp.expand_left_args.pos
                                } : null,
                            expandRightArgs: resp.expand_right_args ?
                                {
                                    leftCtx: resp.expand_right_args.detail_left_ctx,
                                    rightCtx: resp.expand_right_args.detail_right_ctx,
                                    pos: resp.expand_right_args.pos
                                } : null
                        };
                    }
                )
            )
            .subscribe(
                (payload) => {
                    dispatch<GlobalActions.TileDataLoaded<SpeechDataPayload>>({
                        name: GlobalActionName.TileDataLoaded,
                        payload: payload
                    });
                },
                (err) => {
                    console.error(err);
                    dispatch<GlobalActions.TileDataLoaded<SpeechDataPayload>>({
                        name: GlobalActionName.TileDataLoaded,
                        error: err,
                        payload: {
                            tileId: this.tileId,
                            concId: null,
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

    private createBackLink(state:SpeechesModelState):BacklinkWithArgs<BacklinkArgs> {
        return this.backlink ?
            {
                url: this.backlink.url,
                method: this.backlink.method || HTTPMethod.GET,
                label: this.backlink.label,
                args: {
                    corpname: state.corpname,
                    usesubcorp: state.subcname,
                    q: `~${state.concId}`
                }
            } :
            null;
    }

    private playSegments(state:SpeechesModelState, player:AudioPlayer, dispatch:SEDispatcher):void {
        player
            .play(this.normalizeSegments(state.playback.segments, state.corpname))
            .subscribe(
                (data) => {
                    if (data.isPlaying && data.idx === 0) {
                        dispatch<Actions.AudioPlayerStarted>({
                            name: ActionName.AudioPlayerStarted,
                            payload: {
                                tileId: this.tileId,
                                playbackSession: data.sessionId
                            }
                        });
                    } else if (!data.isPlaying && data.idx === data.total - 1) {
                        dispatch<Actions.AudioPlayerStopped>({
                            name: ActionName.AudioPlayerStopped,
                            payload: {
                                tileId: this.tileId
                            }
                        });

                    } else if (data.isPlaying && data.item.lineIdx != state.playback.currLineIdx) {
                        dispatch<Actions.PlayedLineChanged>({
                            name: ActionName.PlayedLineChanged,
                            payload: {
                                tileId: this.tileId,
                                lineIdx: data.item.lineIdx
                            }
                        });
                    }
                },
                (err) => {
                    dispatch<Actions.AudioPlayerStopped>({
                        name: ActionName.AudioPlayerStopped,
                        payload: {
                            tileId: this.tileId
                        }
                    });
                    this.appServices.showMessage(SystemMessageType.ERROR, err);
                },
                () => {
                    dispatch<Actions.AudioPlayerStopped>({
                        name: ActionName.AudioPlayerStopped,
                        payload: {
                            tileId: this.tileId
                        }
                    });
                }
            );
    }

    private dispatchPlayStop(dispatch:SEDispatcher):void {
        dispatch<Actions.AudioPlayerStopped>({
            name: ActionName.AudioPlayerStopped,
            payload: {
                tileId: this.tileId
            }
        });
    }

    sideEffects(state:SpeechesModelState, action:Action, dispatch:SEDispatcher):void {
        switch(action.name) {
            case GlobalActionName.RequestQueryResponse:
                if (this.waitForTile) {
                    this.suspend(
                        (action) => {
                            const payload = action.payload;
                            if (action.name === GlobalActionName.TileDataLoaded && isConcLoadedPayload(payload) &&
                                    action.payload['tileId'] === this.waitForTile) {
                                if (isSubqueryPayload(action.payload)) {
                                    this.reloadData(
                                        state,
                                        dispatch,
                                        action.payload.subqueries.map(v => parseInt(v.value)),
                                        payload.concPersistenceIDs[0]
                                    );

                                } else {
                                    this.reloadData(state, dispatch, null, null);
                                }
                                return true;
                            }
                            return false;
                        }
                    );

                } else {
                    this.reloadData(state, dispatch, null, null);
                }
            break;
            case ActionName.ExpandSpeech:
                if (action.payload['tileId'] === this.tileId) {
                    if (state.playback !== null) {
                        this.appServices.getAudioPlayer().stop(state.playback.currPlaybackSession);
                        this.dispatchPlayStop(dispatch);
                    }
                    this.reloadData(state, dispatch, null, null, action.payload['position']);
                }
            break;
            case ActionName.LoadAnotherSpeech:
                if (action.payload['tileId'] === this.tileId) {
                    if (state.playback !== null) {
                        this.appServices.getAudioPlayer().stop(state.playback.currPlaybackSession);
                        this.dispatchPlayStop(dispatch);
                    }
                    this.reloadData(state, dispatch, null, null, Expand.RELOAD);
                }
            break;
            case ActionName.ClickAudioPlayer:
            case ActionName.ClickAudioPlayAll:
                if (action.payload['tileId'] === this.tileId) {
                    const player = this.appServices.getAudioPlayer();
                    if (state.playback && state.playback.currPlaybackSession) {
                        player.stop(state.playback.currPlaybackSession);
                    }
                    if (state.playback.currLineIdx !== state.playback.newLineIdx) {
                        this.playSegments(state, player, dispatch);

                    } else {
                        this.dispatchPlayStop(dispatch);
                    }
                }
            break;
            case GlobalActionName.GetSourceInfo:
                if (action.payload['tileId'] === this.tileId) {
                    this.api.getSourceDescription(this.tileId, this.appServices.getISO639UILang(), action.payload['corpusId'])
                    .subscribe(
                        (data) => {
                            dispatch({
                                name: GlobalActionName.GetSourceInfoDone,
                                payload: {
                                    data: data
                                }
                            });
                        },
                        (err) => {
                            console.error(err);
                            dispatch({
                                name: GlobalActionName.GetSourceInfoDone,
                                error: err

                            });
                        }
                    );
                }
            break;
        }
    }

}