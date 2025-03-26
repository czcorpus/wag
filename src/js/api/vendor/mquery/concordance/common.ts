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


export type AttrViewMode = 'visible-all'|'visible-kwic'|'visible-multiline'|'mouseover';


export enum ViewMode {
    KWIC = 'kwic',
    SENT = 'sen',
    ALIGN = 'align'
}


export type LineElementType = ''|'strc'|'attr'|'str'|'coll';


export interface LineElement {
    type:LineElementType;
    str:string;
    mouseover?:Array<string>;
}


export interface Line {
    left:Array<LineElement>;
    kwic:Array<LineElement>;
    right:Array<LineElement>;
    align?:Array<{
        left:Array<LineElement>;
        kwic:Array<LineElement>;
        right:Array<LineElement>;
        toknum:number;
    }>;
    toknum:number;
    metadata?:Array<{label:string; value:string}>;
    interactionId?:string;
    isHighlighted?:boolean;
}


export interface ConcResponse {
    query:string;
    corpName:string;
    primaryCorp?:string;
    subcorpName:string;
    lines:Array<Line>;
    concsize:number;
    arf:number;
    ipm:number;
    messages:Array<[string, string]>;
    concPersistenceID:string;
    kwicNumTokens?:number;
}


export interface ConcData {
    concsize:number;
    numPages:number;
    resultARF:number;
    resultIPM:number;
    currPage:number;
    loadPage:number; // the one we are going to load
    concId:string;
    lines:Array<Line>;
}


export function createInitialLinesData(numQueryMatches:number):Array<ConcData> {
    const ans:Array<ConcData> = [];
    for (let i = 0; i < numQueryMatches; i++) {
        ans.push({
            concId: null,
            lines: [],
            concsize: -1,
            numPages: -1,
            resultARF: -1,
            resultIPM: -1,
            currPage: 1,
            loadPage: 1
        });
    }
    return ans;
}