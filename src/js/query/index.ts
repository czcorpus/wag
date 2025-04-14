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

import { pipe, List } from 'cnc-tskit';
import { PosItem, posTagsEqual } from '../postag.js';
import { MainPosAttrValues } from '../conf/index.js';


export enum QueryType {
    SINGLE_QUERY = 'single',
    CMP_QUERY = 'cmp',
    TRANSLAT_QUERY = 'translat'
}

export function importQueryTypeString(v:string, dflt:QueryType):QueryType {
    if (v === QueryType.SINGLE_QUERY || v === QueryType.CMP_QUERY || v === QueryType.TRANSLAT_QUERY) {
        return v as QueryType;

    } else if (!v) {
        return dflt;
    }
    throw new Error(`Unknown query type '${v}'`);
}

export interface SearchDomain {
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

export interface SubqueryPayload {
    tileId:number;
    queryIdx:number;
    domain1:string;
    domain2:string;
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
    lemma:string; // space-based value for a multi-word query
    pos:Array<PosItem>; // each word of a multi-word query
    upos:Array<PosItem>; // each word of a multi-word query
    ipm:number;
    flevel:FreqBand|null;
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
 * Out of provided list of query matches, find the one with
 * the 'current' flag set to true. The function never returns
 * null/undefined - in case there is no match, value with
 * empty lemma, word etc. is returned.
 */
export function findCurrQueryMatch(queryMatches:Array<QueryMatch>):QueryMatch {
    const srch = queryMatches.find(v => v.isCurrent);
    return srch ? srch : {
        lemma: undefined,
        word: undefined,
        pos: [],
        upos: [],
        abs: -1,
        ipm: -1,
        arf: -1,
        flevel: null,
        isCurrent: true
    };
};

/**
 * For each query (1st array dimension) we provide possibly multiple
 * lemma variants (2nd array dimension).
 */
export type RecognizedQueries = Array<Array<QueryMatch>>;


export function testIsDictMatch(queryMatch:QueryMatch):boolean {
    return !!queryMatch.lemma;
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

export function matchesPos(lv:QueryMatchCore, mainPosAttr:MainPosAttrValues, pos:Array<string>):boolean {
    return posTagsEqual(List.map(v => v.value, lv[mainPosAttr]), pos);
}

/**
 * The function finds QueryMatch items with the same lemma and for each
 * such group, it creates an additional QueryMatch item representing
 * "multiple PoS variant". The original items are always preserved
 * so user can select also the exact types.
 */
export function addWildcardMatches(qm:Array<QueryMatch>):Array<QueryMatch> {
    return pipe(
        qm,
        List.groupBy((match) => match.lemma),
        List.map(([, matches]) => {
            if (matches.length > 1) {
                const wildCard:QueryMatch = {
                    lemma: matches[0].lemma,
                    pos: [],
                    upos: [],
                    ipm: List.foldl((acc, m) => acc + m.ipm, 0, matches),
                    flevel: calcFreqBand(List.foldl((acc, m) => acc + m.ipm, 0, matches)),
                    word: matches[0].word,
                    abs: List.foldl((acc, m) => acc + m.abs, 0, matches),
                    arf: -1,
                    isCurrent: false
                };
                return [...matches, wildCard];
            }
            return matches;
        }),
        List.flatMap(v => v)
    );
}
