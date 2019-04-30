/*
 * Copyright 2018 Tomas Machalek <tomas.machalek@gmail.com>
 * Copyright 2018 Institute of the Czech National Corpus,
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


export enum QueryType {
    SINGLE_QUERY = 'single',
    CMP_QUERY = 'cmp',
    TRANSLAT_QUERY = 'translat'
}

export interface SubQueryItem {
    value:string;
    interactionId?:string;
    color?:string;
}

export interface SubqueryPayload {
    tileId:number;
    subqueries:Array<SubQueryItem>;
    lang1:string;
    lang2:string;
}

export function isSubqueryPayload(payload:{}):payload is SubqueryPayload {
    return Array.isArray(payload['subqueries']);
}


export interface LemmaVariant {
    lemma:string;
    word:string;
    pos:QueryPoS;
    posLabel:string;
    abs:number;
    ipm:number;
    arf:number;
    flevel:number;
    isCurrent:boolean;
}

export enum QueryPoS {
    NOUN = 'N',
    ADJECTIVE = 'A',
    PRONOUN = 'P',
    NUMERAL = 'C',
    VERB = 'V',
    ADVERB = 'D',
    PREPOSITION = 'R',
    CONJUNCTION = 'J',
    PARTICLE = 'T',
    INTERJECTION = 'I',
    PUNCTUATION = 'Z',
    UNKNOWN = 'X'
}

export const importQueryPos = (s:string):QueryPoS => {
    if (['n', 'a', 'p', 'c', 'v', 'd', 'r', 'j', 't', 'i', 'z', 'x'].indexOf(s.toLowerCase()) > -1) {
        return s.toUpperCase() as QueryPoS;
    }
    throw new Error(`Invalid PoS value [${s}]`);
};
