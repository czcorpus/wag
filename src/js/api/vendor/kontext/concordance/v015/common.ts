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

import { List, pipe } from 'cnc-tskit';
import { posQueryFactory } from '../../../../../postag';
import { QueryMatch, RangeRelatedSubqueryValue, SubQueryItem } from '../../../../../query';
import { Line, LineElement } from '../../../../abstract/concordance';
import { ConcSubmitArgs } from '../../types';


export interface QueryOperation {
    op:string;
    opid:string;
    nicearg:string;
    tourl:string;
    arg:string;
    size:number;
}

export interface ConcQueryArgs extends ConcSubmitArgs {
    type: 'concQueryArgs';
}

export interface PersistentConcArgs {
    kwicleftctx:number;
    kwicrightctx:number;
    q?:string;
}

export interface ConcQueryResponse {
    Q:Array<string>;
    conc_persistence_op_id:string;
    num_lines_in_groups:number;
    lines_groups_numbers:Array<number>;
    query_overview:Array<QueryOperation>;
    finished:boolean;
    size:number;
    messages:Array<[string, string]>;
}

export interface KontextLine {
    Left:Array<LineElement>;
    Kwic:Array<LineElement>;
    Right:Array<LineElement>;
    Align?:Array<{
        Left:Array<LineElement>;
        Kwic:Array<LineElement>;
        Right:Array<LineElement>;
        toknum:number;
    }>;
    toknum:number;
    kwiclen:string;
    ref:Array<string>;
    interactionId?:string;
    isHighlighted?:boolean;
}

export interface ConcViewResponse {
    conc_persistence_op_id:string;
    messages:Array<[string, string]>;
    Lines:Array<KontextLine>;
    fullsize:number;
    concsize:number;
    result_arf:number;
    result_relative_freq:number;
}

export function escapeVal(v:string) {
    return v.replace(/"/, '\\"');
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

export function mkContextFilter(ctx:[number, number], val:string, subq:SubQueryItem<RangeRelatedSubqueryValue>):string {
    if (ctx[0] === 0 && ctx[1] === 0) {
        return `p0 0>0 0 [lemma="${escapeVal(val)}"]`;
    } else {
        return `P${subq.value.context[0]} ${subq.value.context[1]} 1 [lemma="${escapeVal(subq.value.value)}"]`;
    }
}

export function convertLines(lines:Array<KontextLine>, metadataAttrs?:Array<string>):Array<Line> {
    return lines.map(line => ({
        left: line.Left,
        kwic: line.Kwic,
        right: line.Right,
        align: (line.Align || []).map(al => ({
            left: al.Left,
            kwic: al.Kwic,
            right: al.Right,
            toknum: al.toknum
        })),
        toknum: line.toknum,
        metadata: (line.ref || []).map((v, i) => ({
            value: v,
            label: metadataAttrs ? metadataAttrs[i] : '--'
        }))
    }));
}