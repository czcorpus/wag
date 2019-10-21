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

import { List } from 'immutable';


export enum QueryType {
    SINGLE_QUERY = 'single',
    CMP_QUERY = 'cmp',
    TRANSLAT_QUERY = 'translat'
}

export interface SearchLanguage {
    code:string;
    label:string;
    queryTypes:Array<QueryType>;
}

export interface QueryTypeMenuItem {
    type:QueryType;
    label:string;
    isEnabled:boolean;
}

export interface SubQueryItem<T=string> {
    value:T;
    interactionId?:string;
    color?:string;
}

export interface SubqueryPayload<T=string> {
    tileId:number;
    subqueries:Array<SubQueryItem<T>>;
    lang1:string;
    lang2:string;
}

export function isSubqueryPayload(payload:{}):payload is SubqueryPayload {
    return Array.isArray(payload['subqueries']);
}

export interface LemmaVariant {
    lemma:string;
    word:string;
    pos:Array<{value:QueryPoS; label:string}>;
    abs:number;
    ipm:number;
    arf:number;
    flevel:number;
    isCurrent:boolean;
    isNonDict?:boolean;
}

/**
 * For each query (1st array dimension) we provide possibly multiple
 * lemma variants (2nd array dimension).
 */
export type RecognizedQueries = List<List<LemmaVariant>>;


export function testIsDictQuery(lemmas:List<LemmaVariant>|LemmaVariant):boolean {
    if (List.isList(lemmas)) {
        const tmp = lemmas as List<LemmaVariant>;
        return tmp.size > 1 || !tmp.get(0).isNonDict;
    }
    return !(lemmas as LemmaVariant).isNonDict;
}

export function matchesPos(lv:LemmaVariant, pos:Array<QueryPoS>):boolean {
    return lv.pos.length === pos.length &&
        lv.pos.reduce((acc, curr) => acc && pos.indexOf(curr.value) > -1, true);
}

interface MergedLemmaVariant extends LemmaVariant {
    minAbs:number;
    maxAbs:number;
}

const MERGE_CANDIDATE_MIN_DIFF_RATIO = 100;

/**
 * Freq. database returns a list of LemmaVariant instances with 'pos' array of size 1,
 * i.e. items with the same 'lemma' and 'word' are separate LemmaVariant instances.
 * For further processing we have to merge those items into a single LemmaVariant instance
 * with pos = [all the individual PoS values].
 */
export function findMergeableLemmas(variants:Array<LemmaVariant>):List<LemmaVariant> {
    const mapping:{[key:string]:Array<{pos:{value:QueryPoS; label:string}; abs:number; form:string; arf:number}>} = {};
    variants.forEach(item => {
        if (!(item.lemma in mapping)) {
            mapping[item.lemma] = [];
        }
        item.pos.forEach(p => {
            mapping[item.lemma].push({pos: p, abs: item.abs, form: item.word, arf: item.arf});
        });
    });
    const merged:Array<MergedLemmaVariant> = Object.keys(mapping).filter(lm => mapping[lm].length > 1).map(lm => ({
        lemma: lm,
        word: mapping[lm][0].form, // should be the same for all 0...n
        pos: mapping[lm].map(v => v.pos),
        abs: mapping[lm].reduce((acc, curr) => acc + curr.abs, 0),
        minAbs: mapping[lm].reduce((acc, curr) => acc < curr.abs ? acc : curr.abs, mapping[lm][0].abs),
        maxAbs: mapping[lm].reduce((acc, curr) => acc > curr.abs ? acc : curr.abs, mapping[lm][0].abs),
        ipm: -1,
        arf: mapping[lm].reduce((acc, curr) => acc + curr.arf, 0),
        flevel: -1,
        isCurrent: false
    }));

    let ans = variants.concat([]);
    merged.forEach(item => {
        if (item.maxAbs / item.minAbs >= MERGE_CANDIDATE_MIN_DIFF_RATIO) {
            ans.unshift(item);

        } else {
            ans.push(item);
        }
    });
    return List(ans);
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
