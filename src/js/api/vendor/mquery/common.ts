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

import { List, pipe } from 'cnc-tskit';
import { posQueryFactory } from '../../../postag.js';
import { QueryMatch } from '../../../query/index.js';


export interface FreqRowResponse {
    word:string;
    freq:number;
    base:number;
    ipm:number;
    collWeight:number;
    coOccScore:number;
}


export function escapeVal(v:string) {
    const map = {
        '"': '\\"',
        '?': '\\?',
        '!': '\\!',
        '.': '\\.',
        '*': '\\*',
        '+': '\\+'
    };
    return v.replace(/[?"!.*+]/g, match => map[match]);
}


/**
 * Transform a provided QueryMatch into a valid CQL query.
 *
 * a) lemma with a PoS information like e.g.: lemma='foo bar', tag=['A', 'B']
 * is transformed into: [lemma="foo" & tag="A"] [lemma="bar" & tag="B"].
 * b) lemma without a PoS information, e.g.: lemma='foo bar'
 * is transformed into: [lemma="foo"] [lemma="bar"]
 */
export function mkLemmaMatchQuery(lvar:QueryMatch, generator:[string, string]):string {

    const fn = posQueryFactory(generator[1]);
    return pipe(
        lvar.lemma.split(' '),
        List.map((lemma, i) => lvar.pos[i] !== undefined ?
            `[lemma="${escapeVal(lemma)}" & ${generator[0]}="${fn(lvar.pos[i].value)}"]` :
            `[lemma="${escapeVal(lemma)}"]`)
    ).join(' ');
}


export function mkWordMatchQuery(lvar:QueryMatch):string {
    return List.map(
        word => `[word="${escapeVal(word)}"]`,
        lvar.word.split(' ')
    ).join('');
}


export function mkMatchQuery(lvar:QueryMatch, generator:[string, string]):string {
        if (lvar.pos.length > 0) {
            return mkLemmaMatchQuery(lvar, generator);

        } else if (lvar.word) {
            return mkWordMatchQuery(lvar);
        }
    }