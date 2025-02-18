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

import { ViewMode, Line } from '../../api/abstract/concordance.js';
import { AttrViewMode } from '../../api/vendor/kontext/types.js';


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

export interface ConcordanceMinState {
    tileId:number;
    queries:Array<string>;
    corpname:string;
    otherCorpname:string;
    subcname:string;
    subcDesc:string;
    kwicLeftCtx:number;
    kwicRightCtx:number;
    pageSize:number;
    attr_vmode:AttrViewMode;
    viewMode:ViewMode;
    shuffle:boolean;
    metadataAttrs:Array<{value:string; label:string}>;
    attrs:Array<string>;
    posQueryGenerator:[string, string];
    concordances:Array<ConcData>;
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