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

import { Dict, pipe, List } from 'cnc-tskit';
import { IAppServices } from '../appServices';


export enum QueryType {
    SINGLE_QUERY = 'single',
    CMP_QUERY = 'cmp',
    TRANSLAT_QUERY = 'translat'
}

/**
 * Any PoS encoding, including multi-word one
 * (e.g. 'A N', 'V').
 */
export type QueryPoS = string;

export enum PoSValues {
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

export function importQueryTypeString(v:string, dflt:QueryType):QueryType {
    if (v === QueryType.SINGLE_QUERY || v === QueryType.CMP_QUERY || v === QueryType.TRANSLAT_QUERY) {
        return v as QueryType;

    } else if (!v) {
        return dflt;
    }
    throw new Error(`Unknown query type '${v}'`);
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
    queryId:number;
    subqueries:Array<SubQueryItem<T>>;
    lang1:string;
    lang2:string;
}

export function isSubqueryPayload(payload:{}):payload is SubqueryPayload {
    return Array.isArray(payload['subqueries']);
}

export interface RangeRelatedSubqueryValue {
    value:string;
    context:[number, number];
}

/**
 * FreqBand is an arbitrary frequency band
 */
export type FreqBand = 1|2|3|4|5;

/**
 * calcFreqBand calculates a FreqBand based
 * on provided ipm (instances per million tokens):
 * [0, 1) => 1
 * [1, 10) => 2
 * [10, 100) => 3
 * [100, 1000) => 4
 * [1000, 1000000] => 5
 */
export function calcFreqBand(ipm:number):FreqBand {
    if (ipm < 1) return 1;
    if (ipm < 10) return 2;
    if (ipm < 100) return 3;
    if (ipm < 1000) return 4;
    return 5;
}


export interface QueryMatchCore {
    lemma:string;
    pos:Array<{value:QueryPoS; label:string}>;
    ipm:number;
    flevel:FreqBand|null;
    isNonDict?:boolean;
}


/**
 * QueryMatch represents a single matching item
 * for a query as processed by WaG internal word
 * frequency database. The value can be ambiguous in
 * terms of part of speech (see 'pos' as an Array).
 */
export interface QueryMatch extends QueryMatchCore {
    word:string;
    abs:number;
    arf:number;
    isCurrent:boolean;
}

/**
 * For each query (1st array dimension) we provide possibly multiple
 * lemma variants (2nd array dimension).
 */
export type RecognizedQueries = Array<Array<QueryMatch>>;


export function testIsDictMatch(queryMatches:Array<QueryMatch>|QueryMatch):boolean {
    if (Array.isArray(queryMatches)) {
        const tmp = queryMatches as Array<QueryMatch>;
        return tmp.length > 1 || !tmp[0].isNonDict;
    }
    return !(queryMatches as QueryMatch).isNonDict;
}

/**
 * Test whether at least one of provided matches is a multi-word one.
 */
export function testIsMultiWordMode(queries:RecognizedQueries):boolean {
    return pipe(
        queries,
        List.flatMap(v => v),
        List.some(v => /\s/.test(v.word))
    );
}

export function matchesPos(lv:QueryMatchCore, pos:Array<QueryPoS>):boolean {
    return lv.pos.length === pos.length &&
        lv.pos.reduce((acc, curr) => acc && pos.indexOf(curr.value) > -1, true as boolean);
}

interface MergedQueryMatch extends QueryMatch {
    minAbs:number;
    maxAbs:number;
}

const MERGE_CANDIDATE_MIN_DIFF_RATIO = 100;

/**
 * Freq. database returns a list of QueryMatch instances with 'pos' array of size 1,
 * i.e. items with the same 'lemma' and 'word' are separate QueryMatch instances.
 * For further processing we have to merge those items into a single QueryMatch instance
 * with pos = [all the individual PoS values].
 */
export function findMergeableQueryMatches(variants:Array<QueryMatch>):Array<QueryMatch> {
    const mapping:{[key:string]:Array<{pos:{value:QueryPoS; label:string}; abs:number; form:string; arf:number}>} = {};
    List.forEach(
        item => {
            if (!(item.lemma in mapping)) {
                mapping[item.lemma] = [];
            }
            List.forEach(
                p => {
                    mapping[item.lemma].push({pos: p, abs: item.abs, form: item.word, arf: item.arf});
                },
                item.pos
            );
        },
        variants
    );
    const merged:Array<MergedQueryMatch> = pipe(
        mapping,
        Dict.filter((v) => v.length > 1),
        Dict.map((v, lm) => {
            const ans:MergedQueryMatch = {
                lemma: lm,
                word: v[0].form, // should be the same for all 0...n
                pos: v.map(v => v.pos),
                abs: v.reduce((acc, curr) => acc + curr.abs, 0),
                minAbs: v.reduce((acc, curr) => acc < curr.abs ? acc : curr.abs, v[0].abs),
                maxAbs: v.reduce((acc, curr) => acc > curr.abs ? acc : curr.abs, v[0].abs),
                ipm: -1,
                arf: v.reduce((acc, curr) => acc + curr.arf, 0),
                flevel: null,
                isCurrent: false
            }
            return ans;
        }),
        Dict.toEntries(),
        List.map(([,v]) => v)
    );

    const ans = [...variants];
    List.forEach(
        item => {
            if (item.maxAbs / item.minAbs >= MERGE_CANDIDATE_MIN_DIFF_RATIO) {
                ans.unshift(item);

            } else {
                ans.push(item);
            }
        },
        merged
    );
    return ans;
}

export function importQueryPos(s:string):QueryPoS {
    return List.map(
        v => {
            if (['n', 'a', 'p', 'c', 'v', 'd', 'r', 'j', 't', 'i', 'z', 'x'].indexOf(v.toLowerCase()) > -1) {
                return v.toUpperCase() as QueryPoS;
            }
            throw new Error(`Invalid PoS value [${v}]`);
        },
        s.split(' ')
    ).join(' ');
}

/**

 */
export function importQueryPosWithLabel(s:string, appServices:IAppServices):{value:string; label:string} {
    return pipe(
        s.split(' '),
        List.map(
            v => {
                if (['n', 'a', 'p', 'c', 'v', 'd', 'r', 'j', 't', 'i', 'z', 'x'].indexOf(v.toLowerCase()) > -1) {
                    const ident = v.toUpperCase();
                    return {
                        value: ident,
                        label: appServices.importExternalMessage(ident)
                    };
                }
                throw new Error(`Invalid PoS value [${v}]`);
            }
        ),
        List.foldl(
            (acc, curr) => ({
                value: acc.value + ' ' + curr.value,
                label: acc.label + ' ' + curr.label
            }),
            {value: '', label: ''}
        )
    );
}

