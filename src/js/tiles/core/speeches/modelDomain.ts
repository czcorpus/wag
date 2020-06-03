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

import { BacklinkWithArgs } from '../../../page/tile';
import { LineElement } from '../../../api/abstract/concordance';
import { pipe, Dict, List, Color } from 'cnc-tskit';


export type ConcDetailText = Array<LineElement>;


export interface Segment {
    lineIdx:number;
    value:string;
}

export interface PlayableSegment {
    lineIdx:number;
    url:string;
}

export interface Speech {
    text:ConcDetailText;
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
    backlink:BacklinkWithArgs<BacklinkArgs>;
    maxNumSpeeches:number;
    playback:{
        currLineIdx:number;
        newLineIdx:number;
        segments:Array<Segment>;
        newPlaybackSession:string|null;
        currPlaybackSession:string|null;
    }|null;
}


const ATTR_NAME_ALLOWED_CHARS = 'a-zA-Z0-9_';


export enum Expand {
    TOP = 'top',
    BOTTOM = 'bottom',
    RELOAD = 'reload'
}



function parseTag(name:string, s:string):{[key:string]:string} {
    const srch = new RegExp(`<${name}(\\s+[^>]+)>`).exec(s);
    if (srch) {
        const ans:{[key:string]:string} = {};
        const items = srch[1].trim()
            .split(new RegExp(`([${ATTR_NAME_ALLOWED_CHARS}]+)=`)).slice(1);
        for (let i = 0; i < items.length; i += 2) {
                ans[items[i]] = (items[i+1] || '').trim();
        }
        return ans;
    }
    return null;
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
    return (data || [])
        .reduce(
            (acc, speechChunks, lineIdx) => speechChunks
                .reduce<ConcDetailText>((acc, speech) => acc.concat(speech.text), [])
                .find(x => x.type === 'coll') ?  lineIdx : acc,
            -1
        );
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


export function extractSpeeches(state:SpeechesModelState, concDetail:ConcDetailText):SpeechLines {
    let currSpeech:Speech = createNewSpeech(state, null, null, {});
    let prevSpeech:Speech = null;
    const tmp:Array<Speech> = [];

    (concDetail || []).forEach((item, i) => {
        if (item.type === 'strc') {
            const attrs = parseTag(state.speakerIdAttr[0], item.str);
            if (attrs !== null && attrs[state.speakerIdAttr[1]]) {
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
            if (item.str.indexOf(`<${state.speechSegment[0]}`) > -1) {
                const attrs = parseTag(state.speechSegment[0], item.str);
                if (attrs) {
                    currSpeech.segments.push({
                        lineIdx: -1,
                        value: attrs[state.speechSegment[1]]
                    });
                }
            }
            if (state.spkOverlapMode === 'simple') {
                const overlapSrch = new RegExp(`</?(${state.speechOverlapAttr[0]})(>|[^>]+>)`, 'g');
                let srch:RegExpExecArray;
                while ((srch = overlapSrch.exec(item.str)) !== null) {
                    if (srch[0].indexOf('</') === 0
                            && item.str.indexOf(`<${state.speakerIdAttr[0]}`) > 0) {
                        prevSpeech.text.push({str: srch[0], type: item.type});

                    } else {
                        currSpeech.text.push({str: srch[0], type: item.type});
                    }
                }
            }

        } else {
            currSpeech.text.push({
                str: item.str,
                type: item.type
            });
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