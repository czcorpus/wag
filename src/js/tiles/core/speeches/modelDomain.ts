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

import { BacklinkWithArgs } from '../../../page/tile.js';
import { pipe, Dict, List, Color } from 'cnc-tskit';
import { MarkupToken, SpeechToken } from './api.js';
import { QueryMatch } from '../../../query/index.js';



export interface Segment {
    lineIdx:number;
    value:string;
}

export interface PlayableSegment {
    lineIdx:number;
    url:string;
    format:string;
}

export interface Speech {
    text:Array<SpeechToken>;
    speakerId:string;
    segments:Array<Segment>;
    colorCode:Color.RGBA;
    metadata:{[k:string]:string};
}


export interface ExpandArgs {
    leftCtx:number;
    rightCtx:number;
    pos?:number;
}

export interface BacklinkArgs {
    corpname:string;
    usesubcorp:string;
    q:string;
}


/**
 * Note: A single speech line contains an array of
 * simultaneous speeches (i.e. if two people speak
 * at the same time then the array contains two items).
 */
export type SpeechLine = Array<Speech>;


export type SpeechLines = Array<SpeechLine>;


export interface SpeechesModelState {
    isBusy:boolean;
    isTweakMode:boolean;
    isMobile:boolean;
    error:string;
    corpname:string;
    subcname:string;
    subcDesc:string;
    concId:string;
    availTokens:Array<number>;
    tokenIdx:number;
    kwicNumTokens:number;
    data:SpeechLines;
    expandLeftArgs:Array<ExpandArgs>;
    expandRightArgs:Array<ExpandArgs>;
    speakerIdAttr:[string, string];
    speechSegment:[string, string];
    speechOverlapAttr:[string, string];
    speechOverlapVal:string;
    speakerColors:Array<Color.RGBA>;
    wideCtxGlobals:Array<[string, string]>;
    speakerColorsAttachments:{[k:string]:Color.RGBA};
    spkOverlapMode:'full'|'simple';
    backlink:BacklinkWithArgs<{}>;
    maxNumSpeeches:number;
    playback:{
        currLineIdx:number;
        newLineIdx:number;
        segments:Array<Segment>;
        newPlaybackSession:string|null;
        currPlaybackSession:string|null;
    }|null;
    posQueryGenerator:[string, string];
    queryMatches:Array<QueryMatch>;
}


export enum Expand {
    TOP = 'top',
    BOTTOM = 'bottom',
    RELOAD = 'reload'
}



function createNewSpeech(state:SpeechesModelState, speakerId:string, colorCode:Color.RGBA, metadata:{[attr:string]:string}):Speech {
    const importedMetadata = pipe(
        metadata,
        Dict.filter((val, attr) => attr !== state.speechSegment[1] && attr !== state.speakerIdAttr[1])
    );
    return {
        text: [],
        speakerId: speakerId,
        segments: [],
        metadata: importedMetadata,
        colorCode: colorCode
    };
}


function isOverlap(state:SpeechesModelState, s1:Speech, s2:Speech):boolean {
    if (s1 && s2 && state.spkOverlapMode === 'full') {
        const flag1 = s1.metadata[state.speechOverlapAttr[1]];
        const flag2 = s2.metadata[state.speechOverlapAttr[1]];
        if (flag1 === flag2
                && flag2 === state.speechOverlapVal
                && s1.segments[0].value === s2.segments[0].value) {
            return true;
        }
    }
    return false;
}

function mergeOverlaps(state:SpeechesModelState, speeches:Array<Speech>):SpeechLines {
    const ans:SpeechLines = [];
    let prevSpeech:Speech = null;
    speeches.forEach((item, i) => {
        if (isOverlap(state, prevSpeech, item)) {
            ans[ans.length - 1].push(item);
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
            ans.push([item]);
        }
        prevSpeech = item;
    });
    return ans;
}

/**
 * Return speech index where KWIC is located.
 */
function detectKwicSpeech(data:Array<Array<Speech>>):number {
    return 0; // TODO
}


export function normalizeSpeechesRange(data:Array<Array<Speech>>, maxNumSpeeches:number):Array<Array<Speech>> {
    const kwicLine = detectKwicSpeech(data);
    let lft = 0;
    let rgt = data.length;
    while (rgt - lft > maxNumSpeeches) {
        if (kwicLine - lft > rgt - kwicLine) {
            lft += 1;

        } else {
            rgt -= 1;
        }
    }
    return data.slice(lft, rgt).map((speechLines, lineIdx) => {
        return List.map(
            speech => ({
                text: speech.text,
                speakerId: speech.speakerId,
                segments: List.map(
                    segment => ({
                        lineIdx: lineIdx,
                        value: segment.value
                    }),
                    speech.segments
                ),
                colorCode: speech.colorCode,
                metadata: speech.metadata
            }
        ),
        speechLines)
    });
}


export function extractSpeeches(state:SpeechesModelState, text:Array<SpeechToken|MarkupToken>):SpeechLines {
    let currSpeech:Speech = createNewSpeech(state, null, null, {});
    let prevSpeech:Speech = null;
    const tmp:Array<Speech> = [];
    console.log('Text: ', text);
    (text).forEach((item, i) => {
        if (item.type === 'markup') {
            const attrs = item.attrs;
            if (!!attrs && attrs[state.speakerIdAttr[1]]) {
                    tmp.push(currSpeech);
                    const newSpeakerId = attrs[state.speakerIdAttr[1]];
                    if (!Dict.hasKey(newSpeakerId, state.speakerColorsAttachments)) {
                        state.speakerColorsAttachments[newSpeakerId] = state.speakerColors[Dict.size(state.speakerColorsAttachments)];
                    }
                    prevSpeech = currSpeech;
                    currSpeech = createNewSpeech(
                        state,
                        newSpeakerId,
                        state.speakerColorsAttachments[newSpeakerId],
                        attrs
                    );
            }
            if (item.name === state.speechSegment[0]) {
                if (attrs) {
                    currSpeech.segments.push({
                        lineIdx: -1,
                        value: attrs[state.speechSegment[1]]
                    });
                }
            }
            /*
            TODO OVERLAP !!!!
            if (state.spkOverlapMode === 'simple') {
                if (state.speechOverlapAttr[0] === item.name) {
                const overlapSrch = new RegExp(`</?(${state.speechOverlapAttr[0]})(>|[^>]+>)`, 'g');
                if (item.structureType === 'close') {
                    prevSpeech.text.push(item);

                } else if (item.structureType === 'open') {
                    currSpeech.text.push({str: srch[0], type: item.type});
                }
            }
                */

        } else {
            currSpeech.text.push(item);
        }
    });
    if (currSpeech.text.length > 0) {
        tmp.push(currSpeech);
    }
    return mergeOverlaps(state, tmp).map((v, i) => v.map(sp =>  ({
        colorCode: sp.colorCode,
        metadata: sp.metadata,
        segments: List.map(seg => ({value: seg.value, lineIdx: i}), sp.segments),
        speakerId: sp.speakerId,
        text: sp.text
    })));
}