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

import { List, pipe } from "cnc-tskit";


export type AttrViewMode = 'visible-all'|'visible-kwic'|'visible-multiline'|'mouseover';


export enum ViewMode {
    KWIC = 'kwic',
    SENT = 'sen',
    ALIGN = 'align'
}


export type LineElementType = ''|'strc'|'attr'|'str'|'coll';


export interface Token {
    type:'token'|'markup';
    word:string;
    matchType:'kwic'|'coll';
    strong:boolean;
    attrs:{[name:string]:string};
}


export interface Line {
    ref:string;
    text:Array<Token>;
    alignedText:Array<Token>;
    props:{[name:string]:string};
    interactionId?:string;
    highlighted?:boolean;
}

export function getLineLeftCtx(line:Line):Array<Token> {
    const srchFor = List.some(x => x.matchType === 'kwic', line.text) ?
        'kwic' : 'coll';
    const srchIdx = List.findIndex(x => x.matchType === srchFor, line.text);
    return List.slice(0, srchIdx, line.text);
}


export function getKwicCtx(line:Line):Array<Token> {
    const srchFor = List.some(x => x.matchType === 'kwic', line.text) ?
        'kwic' : 'coll';
    const srchIdx1 = List.findIndex(x => x.matchType === srchFor, line.text);
    const srchIdx2 = pipe(
        line.text,
        List.reversed(),
        List.findIndex(x => x.matchType === srchFor),
        x => x > -1 ? List.size(line.text) - 1 - x : -1
    );
    if (srchIdx1 === -1 || srchIdx2 === -1) {
        throw new Error('cannot find kwic/coll ctx');
    }
    return List.slice(srchIdx1, srchIdx2 + 1, line.text);
}


export function getLineRightCtx(line:Line):Array<Token> {
    const srchFor = List.some(x => x.matchType === 'kwic', line.text) ?
        'kwic' : 'coll';
    const srchIdx = pipe(
        line.text,
        List.reversed(),
        List.findIndex(x => x.matchType === srchFor),
        x => x > -1 ? List.size(line.text) - x : -1
    );
    return List.slice(srchIdx, -1, line.text);
}

export interface ConcResponse {
    concSize:number;
    ipm:number;
    lines:Array<Line>;
    corpname?:string;
    alignedCorpname?:string;
    resultType:'concordance';
}


export interface ConcData {
    queryIdx:number;
    concSize:number;
    ipm:number;
    lines:Array<Line>;
    loadPage:number;
    /**
     * note: starts from 1
     */
    currPage:number;
    numPages:number;
}


export function createInitialLinesData(numQueryMatches:number):Array<ConcData> {
    const ans:Array<ConcData> = [];
    for (let i = 0; i < numQueryMatches; i++) {
        ans.push({
            queryIdx: 0,
            lines: [],
            concSize: 0,
            ipm: 0,
            loadPage: 1,
            currPage: 1,
            numPages: 0
        });
    }
    return ans;
}