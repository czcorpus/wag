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
import { pipe, List, HTTP } from 'cnc-tskit';

import { IAppServices } from '../../../appServices';
import { Backlink, BacklinkWithArgs } from '../../../page/tile';
import { ActionName as GlobalActionName, Actions as GlobalActions, isTileSomeDataLoadedAction } from '../../../models/actions';
import { SpeechDataPayload } from './actions';
import { isSubqueryPayload } from '../../../query/index';
import { SpeechesApi, SpeechReqArgs } from './api';
import { SingleConcLoadedPayload } from '../../../api/abstract/concordance';
import { SpeechesModelState, extractSpeeches, Expand, BacklinkArgs, Segment, PlayableSegment, normalizeSpeechesRange } from './modelDomain';
import { SystemMessageType } from '../../../types';
import { ActionName, Actions } from './actions';
import { normalizeConcDetailTypography } from '../../../models/tiles/concordance/normalize';
import { IAudioUrlGenerator } from '../../../api/abstract/audio';
import { AudioPlayer } from '../../../page/audioPlayer';
import { TileWait } from '../../../models/tileSync';



export interface SpeechesModelArgs {
    dispatcher:IActionQueue;
    tileId:number;
    waitForTiles:Array<number>;
    waitForTilesTimeoutSecs:number;
    subqSourceTiles:Array<number>;
    appServices:IAppServices;
    api:SpeechesApi;
    initState:SpeechesModelState;
    backlink:Backlink;
    audioLinkGenerator:IAudioUrlGenerator;
}

interface ReloadDataArgs {
    state:SpeechesModelState;
    dispatch:SEDispatcher;
    tokens:Array<number>|null;
    concId:string|null;
    kwicNumTokens:number;
    expand?:Expand;
}

export class SpeechesModel extends StatelessModel<SpeechesModelState, TileWait<boolean>> {

    private readonly api:SpeechesApi;

    private readonly appServices:IAppServices;

    private readonly tileId:number;

    private readonly backlink:Backlink;

    private readonly waitForTiles:Array<number>;

    private readonly waitForTilesTimeoutSecs:number;

    private readonly subqSourceTiles:Array<number>;

    private readonly audioLinkGenerator:IAudioUrlGenerator|null;

    constructor({dispatcher, tileId, appServices, api, initState, waitForTiles, waitForTilesTimeoutSecs,
                subqSourceTiles, backlink, audioLinkGenerator}:SpeechesModelArgs) {
        super(dispatcher, initState);
        this.api = api;
        this.appServices = appServices;
        this.tileId = tileId;
        this.backlink = backlink;
        this.waitForTiles = [...waitForTiles];
        this.waitForTilesTimeoutSecs = waitForTilesTimeoutSecs;
        this.subqSourceTiles = [...subqSourceTiles];
        this.audioLinkGenerator = audioLinkGenerator;

        this.addActionHandler<GlobalActions.RequestQueryResponse>(
            GlobalActionName.RequestQueryResponse,
            (state, action) => {
                state.isBusy = true;
                state.error = null;
                state.concId = null;
                state.tokenIdx = 0;
            },
            (state, action, dispatch) => {
                if (this.waitForTiles.length > 0) {
                    this.suspendWithTimeout(
                        this.waitForTilesTimeoutSecs * 1000,
                        TileWait.create(this.waitForTiles, (v)=>false),
                        (action:Action<{tileId:number}>, syncData) => {
                            if (isTileSomeDataLoadedAction(action) && syncData.tileIsRegistered(action.payload.tileId)) {
                                syncData.setTileDone(action.payload.tileId, true);
                                return syncData.next(v => v === true);
                            }
                            return syncData;

                        }
                    ).subscribe(
                        action => {
                            if (isSubqueryPayload(action.payload)) {
                                const payload = action.payload as SingleConcLoadedPayload; // TODO
                                this.reloadData({
                                    state,
                                    dispatch,
                                    tokens: action.payload.subqueries.map(v => parseInt(v.value)),
                                    concId: payload.data.concPersistenceID,
                                    kwicNumTokens: payload.data.kwicNumTokens || 1
                                });

                            } else {
                                this.reloadData({
                                    state,
                                    dispatch,
                                    tokens: null,
                                    concId: null,
                                    kwicNumTokens: 1
                                });
                            }
                        }
                    );

                } else {
                    // TODO load conc here
                    this.reloadData({
                        state,
                        dispatch,
                        tokens: null,
                        concId: null,
                        kwicNumTokens: 1
                    });
                }
            }
        );

        this.addActionHandler<GlobalActions.TileDataLoaded<SpeechDataPayload>>(
            GlobalActionName.TileDataLoaded,
            (state, action) => {
                if (action.payload.tileId === this.tileId) {
                    state.isBusy = false;
                    if (action.error) {
                        state.error = this.appServices.normalizeHttpApiError(action.error);

                    } else {
                        if (action.payload.concId !== null) {
                            state.concId = action.payload.concId;
                        }
                        state.kwicNumTokens = action.payload.kwicNumTokens || 1;

                        state.data = normalizeSpeechesRange(
                            extractSpeeches(state, normalizeConcDetailTypography(action.payload.data)),
                            state.maxNumSpeeches);

                        if (action.payload.availableTokens) {
                            state.availTokens =action.payload.availableTokens;
                        }
                        if (action.payload.expandLeftArgs) {
                            state.expandLeftArgs.push({
                                leftCtx: action.payload.expandLeftArgs.leftCtx,
                                rightCtx: action.payload.expandLeftArgs.rightCtx
                            });

                        } else {
                            state.expandLeftArgs.push(null);
                        }
                        if (action.payload.expandRightArgs) {
                            state.expandRightArgs.push({
                                leftCtx: action.payload.expandRightArgs.leftCtx,
                                rightCtx: action.payload.expandRightArgs.rightCtx
                            });

                        } else {
                            state.expandRightArgs.push(null);
                        }
                        state.backlink = this.createBackLink(state);
                    }
                }
            }
        );

        this.addActionHandler<GlobalActions.EnableTileTweakMode>(
            GlobalActionName.EnableTileTweakMode,
            (state, action) => {
                if (action.payload.ident === this.tileId) {
                    state.isTweakMode = true;
                }
            }
        );

        this.addActionHandler<GlobalActions.DisableTileTweakMode>(
            GlobalActionName.DisableTileTweakMode,
            (state, action) => {
                if (action.payload.ident === this.tileId) {
                    state.isTweakMode = false;
                }
            }
        );

        this.addActionHandler<Actions.ExpandSpeech>(
            ActionName.ExpandSpeech,
            (state, action) => {
                if (action.payload.tileId === this.tileId) {
                    state.isBusy = true;
                }
            },
            (state, action, dispatch) => {
                if (action.payload.tileId === this.tileId) {
                    if (state.playback !== null) {
                        this.appServices.getAudioPlayer().stop(state.playback.currPlaybackSession);
                        this.dispatchPlayStop(dispatch);
                    }
                    this.reloadData({
                        state,
                        dispatch,
                        tokens: null,
                        concId: state.concId,
                        expand: action.payload.position,
                        kwicNumTokens: state.kwicNumTokens
                    });
                }
            }
        );

        this.addActionHandler<Actions.LoadAnotherSpeech>(
            ActionName.LoadAnotherSpeech,
            (state, action) => {
                if (action.payload.tileId === this.tileId) {
                    state.isBusy = true;
                    state.speakerColorsAttachments = {};
                    state.expandLeftArgs = [];
                    state.expandRightArgs = [];
                    state.tokenIdx = (state.tokenIdx + 1) % state.availTokens.length;
                }
            },
            (state, action, dispatch) => {
                if (action.payload.tileId === this.tileId) {
                    if (state.playback !== null) {
                        this.appServices.getAudioPlayer().stop(state.playback.currPlaybackSession);
                        this.dispatchPlayStop(dispatch);
                    }
                    this.reloadData({
                        state,
                        dispatch,
                        tokens: null,
                        concId: state.concId,
                        kwicNumTokens: state.kwicNumTokens,
                        expand: Expand.RELOAD
                    });
                }
            }
        );

        this.addActionHandler<Actions.ClickAudioPlayer>(
            ActionName.ClickAudioPlayer,
            (state, action) => {
                if (action.payload.tileId === this.tileId) {
                    state.playback = {
                        segments: action.payload.segments,
                        currLineIdx: state.playback ? state.playback.currLineIdx : null,
                        newLineIdx: action.payload.lineIdx,
                        currPlaybackSession: state.playback ? state.playback.currPlaybackSession : null,
                        newPlaybackSession: null
                    };
                }
            },
            (state, action, dispatch) => {
                if (action.payload.tileId === this.tileId) {
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
            }
        ).sideEffectAlsoOn(ActionName.ClickAudioPlayAll);

        this.addActionHandler<Actions.ClickAudioPlayAll>(
            ActionName.ClickAudioPlayAll,
            (state, action) => {
                if (action.payload.tileId === this.tileId) {
                    const segments = pipe(
                        state.data,
                        List.reduce(
                            (acc, curr) => acc.concat(curr),
                            []
                        ),
                        List.reduce(
                            (acc, curr) => acc.concat(curr.segments),
                            []
                        )
                    );
                    state.playback = {
                        segments: segments,
                        currLineIdx: state.playback ? state.playback.currLineIdx : null,
                        newLineIdx: segments[0].lineIdx,
                        currPlaybackSession: state.playback ? state.playback.currPlaybackSession : null,
                        newPlaybackSession: null
                    };
                }
            }
        );

        this.addActionHandler<Actions.AudioPlayerStarted>(
            ActionName.AudioPlayerStarted,
            (state, action) => {
                if (action.payload.tileId === this.tileId) {
                    state.playback = {
                        segments: state.playback.segments,
                        currLineIdx: state.playback.newLineIdx,
                        newLineIdx: null,
                        currPlaybackSession: action.payload.playbackSession,
                        newPlaybackSession: null
                    };
                }
            }
        );

        this.addActionHandler<Actions.AudioPlayerStopped>(
            ActionName.AudioPlayerStopped,
            (state, action) => {
                if (action.payload.tileId === this.tileId) {
                    state.playback = null;
                }
            }
        );

        this.addActionHandler<Actions.PlayedLineChanged>(
            ActionName.PlayedLineChanged,
            (state, action) => {
                if (action.payload.tileId === this.tileId) {
                    state.playback = {
                        currLineIdx: action.payload.lineIdx,
                        newLineIdx: null,
                        segments: state.playback.segments,
                        newPlaybackSession: state.playback.newPlaybackSession,
                        currPlaybackSession: state.playback.currPlaybackSession
                    };
                }
            }
        );

        this.addActionHandler<GlobalActions.GetSourceInfo>(
            GlobalActionName.GetSourceInfo,
            null,
            (state, action, dispatch) => {
                if (action.payload.tileId === this.tileId) {
                    this.api.getSourceDescription(this.tileId, this.appServices.getISO639UILang(), action.payload.corpusId)
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
            }
        );
    }

    private normalizeSegments(segments:Array<Segment>, corpname:string):Array<PlayableSegment> {
        return pipe(
            segments,
            List.groupBy(seg => seg.value), // solving multiple speaking people at the same time
            List.map(([,segment]) => segment[0]),
            List.map(v => ({
                lineIdx: v.lineIdx,
                url: this.audioLinkGenerator.createUrl(corpname, v.value)
            }))
        );
    }

    private createArgs(state:SpeechesModelState, pos:number, kwicNumTokens:number, expand:Expand):SpeechReqArgs {
        const args:SpeechReqArgs = {
            attrs: 'word',
            attr_allpos: 'all',
            ctxattrs: 'word',
            corpname: state.corpname,
            pos: pos,
            hitlen: kwicNumTokens,
            structs: [
                state.speakerIdAttr[0] + '.' + state.speakerIdAttr[1],
                state.speechOverlapAttr[0] + '.' + state.speechOverlapAttr[1],
                state.speechSegment[0] + '.' + state.speechSegment[1]
            ].join(','),
            format: 'json'
        };

        if (expand === Expand.TOP) {
            args.detail_left_ctx = List.get(-1, state.expandLeftArgs).leftCtx;
            args.detail_right_ctx = List.get(-1, state.expandLeftArgs).rightCtx;

        } else if (expand === Expand.BOTTOM) {
            args.detail_left_ctx = List.get(-1, state.expandRightArgs).leftCtx;
            args.detail_right_ctx = List.get(-1, state.expandRightArgs).rightCtx;

        } else if (expand === Expand.RELOAD && state.expandLeftArgs.length > 1
                && state.expandRightArgs.length > 1) {
            args.detail_left_ctx = List.get(-1, state.expandRightArgs).leftCtx;
            args.detail_right_ctx = List.get(-1, state.expandLeftArgs).rightCtx;
        }

        return args;
    }

    private reloadData({state, dispatch, tokens, concId, expand, kwicNumTokens}:ReloadDataArgs):void {
        this.api
            .call(this.createArgs(state, (tokens || state.availTokens)[state.tokenIdx], kwicNumTokens, expand))
            .subscribe(
                (payload) => {
                    dispatch<GlobalActions.TileDataLoaded<SpeechDataPayload>>({
                        name: GlobalActionName.TileDataLoaded,
                        payload: {
                            tileId: this.tileId,
                            isEmpty: payload.content.length === 0,
                            availableTokens: tokens,
                            concId: concId,
                            kwicNumTokens: kwicNumTokens,
                            data: List.map(
                                v => ({
                                    str: v.str,
                                    type: v.class,
                                    mouseover: v.mouseover
                                }),
                                payload.content
                            ),
                            expandLeftArgs: payload.expand_left_args ?
                                {
                                    leftCtx: payload.expand_left_args.detail_left_ctx,
                                    rightCtx: payload.expand_left_args.detail_right_ctx,
                                    pos: payload.expand_left_args.pos
                                } : null,
                            expandRightArgs: payload.expand_right_args ?
                                {
                                    leftCtx: payload.expand_right_args.detail_left_ctx,
                                    rightCtx: payload.expand_right_args.detail_right_ctx,
                                    pos: payload.expand_right_args.pos
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
                            concId: null,
                            kwicNumTokens: 1,
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
                method: this.backlink.method || HTTP.Method.GET,
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


}