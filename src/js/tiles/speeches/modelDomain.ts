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
import * as Immutable from 'immutable';
import { RGBAColor } from '../../common/types';


export type ConcDetailText = Array<{str:string; class:string}>;


export interface Speech {
    text:ConcDetailText;
    speakerId:string;
    segments:Immutable.List<string>;
    colorCode:RGBAColor;
    metadata:Immutable.Map<string, string>;
}


export interface ExpandArgs {
    leftCtx:number;
    rightCtx:number;
    pos?:number;
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
    subcDesc:string;
    concId:string;
    availTokens:Immutable.List<number>;
    tokenIdx:number;
    data:SpeechLines;
    expandLeftArgs:Immutable.List<ExpandArgs>;
    expandRightArgs:Immutable.List<ExpandArgs>;
    speakerIdAttr:[string, string];
    speechSegment:[string, string];
    speechOverlapAttr:[string, string];
    speechOverlapVal:string;
    speechAttrs:Immutable.List<string>;
    speakerColors:Immutable.List<RGBAColor>;
    wideCtxGlobals:Immutable.List<[string, string]>;
    speakerColorsAttachments:Immutable.Map<string, RGBAColor>;
    spkOverlapMode:'full'|'simple';
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

function createNewSpeech(state:SpeechesModelState, speakerId:string, colorCode:RGBAColor, metadata:{[attr:string]:string}):Speech {
    const importedMetadata = Immutable.Map<string, string>(metadata)
            .filter((val, attr) => attr !== state.speechSegment[1] &&
                        attr !== state.speakerIdAttr[1])
            .toMap();
    return {
        text: [],
        speakerId: speakerId,
        segments: Immutable.List<string>(),
        metadata: importedMetadata,
        colorCode: colorCode
    };
}


function isOverlap(state:SpeechesModelState, s1:Speech, s2:Speech):boolean {
    if (s1 && s2 && state.spkOverlapMode === 'full') {
        const flag1 = s1.metadata.get(state.speechOverlapAttr[1]);
        const flag2 = s2.metadata.get(state.speechOverlapAttr[1]);
        if (flag1 === flag2
                && flag2 === state.speechOverlapVal
                && s1.segments.get(0) === s2.segments.get(0)) {
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


export function extractSpeeches(state:SpeechesModelState, concDetail:ConcDetailText):SpeechLines {
    let currSpeech:Speech = createNewSpeech(state, '\u2026', null, {});
    let prevSpeech:Speech = null;
    const tmp:Array<Speech> = [];

    (concDetail || []).forEach((item, i) => {
        if (item.class === 'strc') {
            const attrs = parseTag(state.speakerIdAttr[0], item.str);
            if (attrs !== null && attrs[state.speakerIdAttr[1]]) {
                    tmp.push(currSpeech);
                    const newSpeakerId = attrs[state.speakerIdAttr[1]];
                    if (!state.speakerColorsAttachments.has(newSpeakerId)) {
                        state.speakerColorsAttachments = state.speakerColorsAttachments.set(
                            newSpeakerId, state.speakerColors.get(state.speakerColorsAttachments.size)
                        )
                    }
                    prevSpeech = currSpeech;
                    currSpeech = createNewSpeech(
                        state,
                        newSpeakerId,
                        state.speakerColorsAttachments.get(newSpeakerId),
                        attrs
                    );
            }
            if (item.str.indexOf(`<${state.speechSegment[0]}`) > -1) {
                const attrs = parseTag(state.speechSegment[0], item.str);
                if (attrs) {
                    currSpeech.segments = currSpeech.segments.push(attrs[state.speechSegment[1]]);
                }

            }
            if (state.spkOverlapMode === 'simple') {
                const overlapSrch = new RegExp(`</?(${state.speechOverlapAttr[0]})(>|[^>]+>)`, 'g');
                let srch;
                let i = 0;
                while ((srch = overlapSrch.exec(item.str)) !== null) {
                    if (srch[0].indexOf('</') === 0
                            && item.str.indexOf(`<${state.speakerIdAttr[0]}`) > 0) {
                        prevSpeech.text.push({str: srch[0], class: item.class});

                    } else {
                        currSpeech.text.push({str: srch[0], class: item.class});
                    }
                    i += 1;
                }
            }

        } else {
            currSpeech.text.push({
                str: item.str,
                class: item.class
            });
        }
    });
    if (currSpeech.text.length > 0) {
        tmp.push(currSpeech);
    }
    return mergeOverlaps(state, tmp);
}