/*
 * Copyright 2023 Martin Zimandl <martin.zimandl@gmail.com>
 * Copyright 2023 Institute of the Czech National Corpus,
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

export interface SCollsRequest {
    params:{
        corpname:string;
        queryType:SCollsQueryType;
    },
    args:{
        w:string;
        textType?:string;
        deprel?:string;
        pos?:string;
    }
}


// query types are mquery endpoint values
export type SCollsQueryType = 'nouns-modified-by'|'modifiers-of'|'verbs-subject'|'verbs-object'|'mixed'|'none';

export interface SCollsDataRow {
    value:string;
    pos?:string;
    deprel?:string;
    freq:number;
    base:number;
    ipm:number;
    collWeight:number;
    logDice?:number;
    tscore?:number;
    lmi?:number;
    ll?:number;
    rrf?:number;
    mutualDist?:number;
    color?:string;
}

export interface SCollsData {
    rows:Array<SCollsDataRow>;
    examplesQueryTpl:string;
}
