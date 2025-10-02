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
import { StatelessModel, SEDispatcher, IActionQueue } from 'kombo';
import { pipe, List, tuple } from 'cnc-tskit';

import { IAppServices } from '../../../appServices.js';
import { Actions as GlobalActions } from '../../../models/actions.js';
import { SubqueryPayload } from '../../../query/index.js';
import { SpeechesApi, SpeechReqArgs } from './api.js';
import {
    SpeechesModelState,
    extractSpeeches,
    Segment,
    PlayableSegment,
    AudioLinkGenerator,
} from './common.js';
import { SystemMessageType } from '../../../types.js';
import { Actions } from './actions.js';
import { AudioPlayer } from '../../../page/audioPlayer.js';
import { ConcResponse } from '../../../api/vendor/mquery/concordance/common.js';
import { mkLemmaMatchQuery } from '../../../api/vendor/mquery/common.js';
import { IDataStreaming } from '../../../page/streaming.js';

/**
 * A general action notifying about single query
 * (out of possibly multiple queries) concordance load.
 */
export interface SingleConcLoadedPayload extends SubqueryPayload {
    tileId: number;
    data: ConcResponse;
}

export interface SpeechesModelArgs {
    dispatcher: IActionQueue;
    tileId: number;
    appServices: IAppServices;
    api: SpeechesApi;
    initState: SpeechesModelState;
    audioLinkGenerator: AudioLinkGenerator;
}

interface ReloadDataArgs {
    state: SpeechesModelState;
    dispatch: SEDispatcher;
    streaming: IDataStreaming;
    range: [number, number];
}

export class SpeechesModel extends StatelessModel<SpeechesModelState> {
    static DEFAULT_LEFT_RANGE = 30;

    static DEFAULT_RIGHT_RANGE = 30;

    private readonly api: SpeechesApi;

    private readonly appServices: IAppServices;

    private readonly tileId: number;

    private readonly audioLinkGenerator: AudioLinkGenerator | null;

    constructor({
        dispatcher,
        tileId,
        appServices,
        api,
        initState,
        audioLinkGenerator,
    }: SpeechesModelArgs) {
        super(dispatcher, initState);
        this.api = api;
        this.appServices = appServices;
        this.tileId = tileId;
        this.audioLinkGenerator = audioLinkGenerator;

        this.addActionHandler(
            GlobalActions.RequestQueryResponse,
            (state, action) => {
                state.isBusy = true;
                state.error = null;
            },
            (state, action, dispatch) => {
                this.reloadData({
                    state,
                    streaming: appServices.dataStreaming(),
                    dispatch,
                    range: tuple(state.leftRange, state.rightRange),
                });
            }
        );

        this.addActionSubtypeHandler(
            Actions.TileDataLoaded,
            (action) => action.payload.tileId === this.tileId,
            (state, action) => {
                state.isBusy = false;
                if (action.error) {
                    state.error = this.appServices.normalizeHttpApiError(
                        action.error
                    );
                } else {
                    state.kwicNumTokens = action.payload.kwicNumTokens || 1;
                    state.data = extractSpeeches(
                        state,
                        action.payload.data,
                        action.payload.kwicTokenIdx
                    );
                    state.backlink = this.api.getBacklink(0);
                }
            }
        );

        this.addActionSubtypeHandler(
            GlobalActions.EnableTileTweakMode,
            (action) => action.payload.ident === this.tileId,
            (state, action) => {
                state.isTweakMode = true;
            }
        );

        this.addActionSubtypeHandler(
            GlobalActions.DisableTileTweakMode,
            (action) => action.payload.ident === this.tileId,
            (state, action) => {
                state.isTweakMode = false;
            }
        );

        this.addActionSubtypeHandler(
            Actions.ExpandSpeech,
            (action) => action.payload.tileId === this.tileId,
            (state, action) => {
                state.isBusy = true;
            },
            (state, action, dispatch) => {
                if (state.playback !== null) {
                    this.appServices.getAudioPlayer().stop();
                    this.dispatchPlayStop(dispatch);
                }
                this.reloadData({
                    state,
                    streaming: this.appServices
                        .dataStreaming()
                        .startNewSubgroup(this.tileId),
                    range: [
                        state.leftRange + action.payload.leftChange,
                        state.rightRange + action.payload.rightChange,
                    ],
                    dispatch,
                });
            }
        );

        this.addActionSubtypeHandler(
            Actions.LoadAnotherSpeech,
            (action) => action.payload.tileId === this.tileId,
            (state, action) => {
                state.isBusy = true;
                state.speakerColorsAttachments = {};
                state.leftRange = SpeechesModel.DEFAULT_LEFT_RANGE;
                state.rightRange = SpeechesModel.DEFAULT_RIGHT_RANGE;
            },
            (state, action, dispatch) => {
                if (state.playback !== null) {
                    this.appServices.getAudioPlayer().stop();
                    this.dispatchPlayStop(dispatch);
                }
                this.reloadData({
                    state,
                    streaming: this.appServices
                        .dataStreaming()
                        .startNewSubgroup(this.tileId),
                    range: tuple(state.leftRange, state.rightRange),
                    dispatch,
                });
            }
        );

        this.addActionSubtypeHandler(
            Actions.ClickAudioPlayer,
            (action) => action.payload.tileId === this.tileId,
            (state, action) => {
                state.playback = {
                    segments: action.payload.segments,
                    currLineIdx: state.playback
                        ? state.playback.currLineIdx
                        : null,
                    newLineIdx: action.payload.lineIdx,
                    currPlaybackSession: state.playback
                        ? state.playback.currPlaybackSession
                        : null,
                    newPlaybackSession: null,
                };
            },
            (state, action, dispatch) => {
                const player = this.appServices.getAudioPlayer();
                if (state.playback && state.playback.currPlaybackSession) {
                    player.stop();
                }
                if (state.playback.currLineIdx !== state.playback.newLineIdx) {
                    this.playSegments(state, player, dispatch);
                } else {
                    this.dispatchPlayStop(dispatch);
                }
            }
        ).sideEffectAlsoOn(Actions.ClickAudioPlayAll.name);

        this.addActionSubtypeHandler(
            Actions.ClickAudioPlayAll,
            (action) => action.payload.tileId === this.tileId,
            (state, action) => {
                const segments = pipe(
                    state.data,
                    List.reduce((acc, curr) => acc.concat(curr), []),
                    List.reduce((acc, curr) => acc.concat(curr.segments), [])
                );
                state.playback = {
                    segments: segments,
                    currLineIdx: state.playback
                        ? state.playback.currLineIdx
                        : null,
                    newLineIdx: segments[0].lineIdx,
                    currPlaybackSession: state.playback
                        ? state.playback.currPlaybackSession
                        : null,
                    newPlaybackSession: null,
                };
            }
        );

        this.addActionSubtypeHandler(
            Actions.AudioPlayerStarted,
            (action) => action.payload.tileId === this.tileId,
            (state, action) => {
                state.playback = {
                    segments: state.playback.segments,
                    currLineIdx: state.playback.newLineIdx,
                    newLineIdx: null,
                    currPlaybackSession: action.payload.playbackSession,
                    newPlaybackSession: null,
                };
            }
        );

        this.addActionSubtypeHandler(
            Actions.AudioPlayerStopped,
            (action) => action.payload.tileId === this.tileId,
            (state, action) => {
                state.playback = null;
            }
        );

        this.addActionSubtypeHandler(
            Actions.PlayedLineChanged,
            (action) => action.payload.tileId === this.tileId,
            (state, action) => {
                state.playback = {
                    currLineIdx: action.payload.lineIdx,
                    newLineIdx: null,
                    segments: state.playback.segments,
                    newPlaybackSession: state.playback.newPlaybackSession,
                    currPlaybackSession: state.playback.currPlaybackSession,
                };
            }
        );

        this.addActionSubtypeHandler(
            GlobalActions.GetSourceInfo,
            (action) => action.payload.tileId === this.tileId,
            null,
            (state, action, dispatch) => {
                this.api
                    .getSourceDescription(
                        appServices
                            .dataStreaming()
                            .startNewSubgroup(this.tileId),
                        this.tileId,
                        appServices.getISO639UILang(),
                        action.payload.corpusId
                    )
                    .subscribe({
                        next: (data) => {
                            dispatch({
                                name: GlobalActions.GetSourceInfoDone.name,
                                payload: {
                                    data: data,
                                },
                            });
                        },
                        error: (err) => {
                            console.error(err);
                            dispatch({
                                name: GlobalActions.GetSourceInfoDone.name,
                                error: err,
                            });
                        },
                    });
            }
        );

        this.addActionSubtypeHandler(
            GlobalActions.FollowBacklink,
            (action) => action.payload.tileId === this.tileId,
            (state, action) => {
                const url = this.api.requestBacklink(this.stateToArgs(state));
                window.open(url.toString(), '_blank');
            }
        );
    }

    private normalizeSegments(
        segments: Array<Segment>,
        corpname: string
    ): Array<PlayableSegment> {
        return pipe(
            segments,
            List.groupBy((seg) => seg.value), // solving multiple speaking people at the same time
            List.map(([, segment]) => segment[0]),
            List.map((v) => ({
                lineIdx: v.lineIdx,
                url: this.audioLinkGenerator.createUrl(corpname, v.value),
                format: this.audioLinkGenerator.getFormat(v.value),
            }))
        );
    }

    private stateToArgs(
        state: SpeechesModelState,
        range?: [number, number]
    ): SpeechReqArgs | null {
        if (state.queryMatches[0].lemma) {
            return {
                corpname: state.corpname,
                subcorpus: state.subcname,
                query: mkLemmaMatchQuery(
                    state.queryMatches[0],
                    state.posQueryGenerator
                ),
                // hitlen: kwicNumTokens,  TODO
                struct: [
                    state.speakerIdAttr[0] + '.' + state.speakerIdAttr[1],
                    state.speechOverlapAttr[0] +
                        '.' +
                        state.speechOverlapAttr[1],
                    state.speechSegment[0] + '.' + state.speechSegment[1],
                ],
                leftCtx: range ? range[0] : state.leftRange,
                rightCtx: range ? range[1] : state.rightRange,
            };
        }
        return null;
    }

    private reloadData({
        state,
        streaming,
        range,
        dispatch,
    }: ReloadDataArgs): void {
        this.api
            .call(streaming, this.tileId, 0, this.stateToArgs(state, range))
            .subscribe({
                next: (resp) => {
                    dispatch<typeof Actions.TileDataLoaded>({
                        name: Actions.TileDataLoaded.name,
                        payload: {
                            tileId: this.tileId,
                            isEmpty: List.empty(resp.text),
                            data: resp.text,
                            kwicNumTokens: 1, // TODO
                            kwicTokenIdx: resp.kwicTokenIdx,
                        },
                    });
                },
                error: (error) => {
                    console.error(error);
                    dispatch<typeof Actions.TileDataLoaded>({
                        name: Actions.TileDataLoaded.name,
                        error,
                        payload: {
                            tileId: this.tileId,
                            kwicNumTokens: 1,
                            kwicTokenIdx: -1,
                            isEmpty: true,
                            data: null,
                        },
                    });
                },
            });
    }

    private playSegments(
        state: SpeechesModelState,
        player: AudioPlayer,
        dispatch: SEDispatcher
    ): void {
        player
            .play(
                this.normalizeSegments(state.playback.segments, state.corpname)
            )
            .subscribe({
                next: (data) => {
                    if (data.isPlaying && data.idx === 0) {
                        dispatch<typeof Actions.AudioPlayerStarted>({
                            name: Actions.AudioPlayerStarted.name,
                            payload: {
                                tileId: this.tileId,
                                playbackSession: data.sessionId,
                            },
                        });
                    } else if (!data.isPlaying && data.idx === data.total - 1) {
                        dispatch<typeof Actions.AudioPlayerStopped>({
                            name: Actions.AudioPlayerStopped.name,
                            payload: {
                                tileId: this.tileId,
                            },
                        });
                    } else if (
                        data.isPlaying &&
                        data.item.lineIdx != state.playback.currLineIdx
                    ) {
                        dispatch<typeof Actions.PlayedLineChanged>({
                            name: Actions.PlayedLineChanged.name,
                            payload: {
                                tileId: this.tileId,
                                lineIdx: data.item.lineIdx,
                            },
                        });
                    }
                },
                error: (error) => {
                    dispatch<typeof Actions.AudioPlayerStopped>({
                        name: Actions.AudioPlayerStopped.name,
                        payload: {
                            tileId: this.tileId,
                        },
                    });
                    this.appServices.showMessage(
                        SystemMessageType.ERROR,
                        error
                    );
                },
                complete: () => {
                    dispatch<typeof Actions.AudioPlayerStopped>({
                        name: Actions.AudioPlayerStopped.name,
                        payload: {
                            tileId: this.tileId,
                        },
                    });
                },
            });
    }

    private dispatchPlayStop(dispatch: SEDispatcher): void {
        dispatch<typeof Actions.AudioPlayerStopped>({
            name: Actions.AudioPlayerStopped.name,
            payload: {
                tileId: this.tileId,
            },
        });
    }
}
