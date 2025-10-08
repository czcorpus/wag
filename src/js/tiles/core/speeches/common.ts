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

import { pipe, Dict, List, Color } from 'cnc-tskit';
import { MarkupToken, SpeechToken } from './api.js';
import { QueryMatch } from '../../../query/index.js';
import urlJoin from 'url-join';
import { Backlink } from '../../../page/tile.js';
import { PosQueryGeneratorType } from '../../../conf/common.js';

export interface Segment {
    lineIdx: number;
    value: string;
}

export interface PlayableSegment {
    lineIdx: number;
    url: string;
    format: string;
}

export interface Speech {
    text: Array<SpeechToken>;
    speakerId: string;
    segments: Array<Segment>;
    isOverlap: boolean;
    metadata: { [k: string]: string };
}

/**
 * Note: A single speech line contains an array of
 * simultaneous speeches (i.e. if two people speak
 * at the same time then the array contains two items).
 */
export type SpeechLine = Array<Speech>;

export type SpeechLines = Array<SpeechLine>;

export interface SpeechesModelState {
    isBusy: boolean;
    isTweakMode: boolean;
    isMobile: boolean;
    error: string;
    corpname: string;
    subcname: string;
    subcDesc: string;
    kwicNumTokens: number;
    data: SpeechLines;
    leftRange: number;
    rightRange: number;
    maxSingleSideRange: number;
    speakerIdAttr: [string, string];
    speechSegment: [string, string];
    speechOverlapAttr: [string, string];
    speechOverlapVal: string;
    speakers: Array<string>;
    spkOverlapMode: 'full' | 'simple';
    backlink: Backlink;
    maxNumSpeeches: number;
    playbackEnabled: boolean;
    playback: {
        currLineIdx: number;
        newLineIdx: number;
        segments: Array<Segment>;
        newPlaybackSession: string | null;
        currPlaybackSession: string | null;
    } | null;
    posQueryGenerator: PosQueryGeneratorType;
    queryMatches: Array<QueryMatch>;
}

function createNewSpeech(
    state: SpeechesModelState,
    speechTpl: Speech,
    metadata: { [attr: string]: string }
): Speech {
    const iMetadata = pipe(
        metadata,
        Dict.filter(
            (val, attr) =>
                attr !== state.speechSegment[1] &&
                attr !== state.speakerIdAttr[1]
        )
    );
    const ans = { ...speechTpl, iMetadata };
    if (ans.text === undefined) {
        ans.text = [];
    }
    if (ans.segments === undefined) {
        ans.segments = [];
    }
    return ans;
}

function isOverlap(state: SpeechesModelState, s1: Speech, s2: Speech): boolean {
    if (s1 && s2 && state.spkOverlapMode === 'full') {
        if (
            s1.isOverlap &&
            s2.isOverlap &&
            s1.segments[0].value === s2.segments[0].value
        ) {
            return true;
        }
    }
    return false;
}

function mergeOverlaps(
    state: SpeechesModelState,
    speeches: Array<Speech>
): SpeechLines {
    const ans: SpeechLines = [];
    let prevSpeech: Speech = null;
    speeches.forEach((currSpeech, i) => {
        if (isOverlap(state, prevSpeech, currSpeech)) {
            ans[ans.length - 1].push(currSpeech);
            ans[ans.length - 1] = ans[ans.length - 1].sort((s1, s2) => {
                if (s1.speakerId > s2.speakerId) {
                    return 1;
                } else if (s1.speakerId < s2.speakerId) {
                    return -1;
                } else {
                    return 0;
                }
            });
        } else {
            ans.push([currSpeech]);
        }
        prevSpeech = currSpeech;
    });
    return ans;
}

export function extractSpeeches(
    state: SpeechesModelState,
    text: Array<SpeechToken | MarkupToken>,
    kwicIdx: number
): SpeechLines {
    let currSpeech: Speech = createNewSpeech(
        state,
        {
            text: [],
            speakerId: '',
            segments: [],
            isOverlap: false,
            metadata: {},
        },
        {}
    );
    let prevSpeech: Speech = null;
    const tmp: Array<Speech> = [];
    text.forEach((item) => {
        if (item.type === 'markup') {
            const attrs = item.attrs;
            if (!!attrs && attrs[state.speakerIdAttr[1]]) {
                tmp.push(currSpeech);
                const newSpeakerId = attrs[state.speakerIdAttr[1]];
                state.speakers = List.addUnique(newSpeakerId, state.speakers);
                prevSpeech = currSpeech;
                currSpeech = createNewSpeech(
                    state,
                    {
                        text: [],
                        speakerId: newSpeakerId,
                        segments: [],
                        isOverlap:
                            item.attrs[state.speechOverlapAttr[1]] ===
                            state.speechOverlapVal,
                        metadata: {},
                    },
                    attrs
                );
            }
            if (item.name === state.speechSegment[0]) {
                if (attrs) {
                    currSpeech.segments.push({
                        lineIdx: -1,
                        value: attrs[state.speechSegment[1]],
                    });
                }
            }
        } else {
            currSpeech.text.push(item);
        }
    });
    if (currSpeech.text.length > 0) {
        tmp.push(currSpeech);
    }
    return List.map(
        (v, i) =>
            List.map(
                (sp) => ({
                    metadata: sp.metadata,
                    segments: List.map(
                        (seg) => ({ value: seg.value, lineIdx: i }),
                        sp.segments
                    ),
                    speakerId: sp.speakerId,
                    text: sp.text,
                    isOverlap: sp.isOverlap,
                }),
                v
            ),
        mergeOverlaps(state, tmp)
    );
}

export class AudioLinkGenerator {
    private readonly rootUrl: string;

    constructor(rootUrl: string) {
        this.rootUrl = rootUrl;
    }

    createUrl(corpname: string, audioId: string): string {
        return (
            urlJoin(this.rootUrl, 'audio', corpname) +
            '?chunk=' +
            encodeURIComponent(audioId)
        );
    }

    getFormat(audioId: string): string {
        return audioId.split('.').pop();
    }
}
