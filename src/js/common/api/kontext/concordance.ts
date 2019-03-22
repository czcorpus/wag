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
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { ajax$ } from '../../ajax';
import { DataApi, HTTPHeaders, LemmaVariant } from '../../types';
import { posQueryFactory } from './posQuery';


export enum QuerySelector {
    BASIC = 'iqueryrow',
    CQL = 'cqlrow',
    LEMMA = 'lemmarow',
    WORD = 'wordrow',
    PHRASE = 'phraserow'
}

export enum ViewMode {
    KWIC = 'kwic',
    SENT = 'sen',
    ALIGN = 'align'
}

export interface AnyQuery {
    queryselector:QuerySelector;
    usesubcorp?:string;
    iquery?:string;
    lemma?:string;
    cql?:string;
    word?:string;
    phrase?:string;
}

export enum PCQValue {
    POS = 'pos',
    NET = 'neg'
}

export interface RequestArgs extends AnyQuery {
    corpname:string;
    kwicleftctx:string;
    kwicrightctx:string;
    async:string;
    pagesize:string;
    fromp:string;
    attr_vmode:string;
    attrs:string;
    viewmode:ViewMode;
    shuffle?:number;
    q?:string; // here we modify an existing concordance
    format:'json';
}

export enum PNFilter {
    POS = 'p',
    NEG = 'n'
}

export interface FilterRequestArgs extends RequestArgs {
    pnfilter:PNFilter;
    filfl:'f';
    filfpos:number;
    filtpos:number;
    inclkwic:number;
}

export interface PCRequestArgs extends RequestArgs {
    maincorp:string;
    align:string;
    [parg:string]:string|number;
}


export interface LineElement {
    'class':string;
    str:string;
    mouseover?:Array<string>;
}

export interface Line {
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
    interactionId?:string;
    isHighlighted?:boolean;
}

interface HTTPResponse {
    conc_persistence_op_id:string;
    messages:Array<[string, string]>;
    Lines:Array<Line>;
    fullsize:number;
    concsize:number;
    result_arf:number;
    result_relative_freq:number;
}

export interface ConcResponse extends HTTPResponse {
    query:string;
    corpname:string;
    usesubcorp:string;
}

export const getQuery = (args:AnyQuery):string => {
    switch (args.queryselector) {
        case QuerySelector.BASIC:
            return args.iquery;
        case QuerySelector.CQL:
            return args.cql;
        case QuerySelector.LEMMA:
            return args.lemma;
        case QuerySelector.WORD:
            return args.word;
        case QuerySelector.PHRASE:
            return args.phrase;
        default:
            throw new Error(`Unsupported query selector ${args.queryselector}`);
    }
};


const escapeVal = (v:string) => v.replace(/"/, '\\"');

export const mkFullMatchQuery = (lvar:LemmaVariant, generator:[string, string]):string => {
    const fn = posQueryFactory(generator[1]);
    return `[word="${escapeVal(lvar.word)}" & lemma="${escapeVal(lvar.lemma)}" & ${generator[0]}="${fn(lvar.pos)}"]`; // TODO escape stuff !!!
};

export const mkLemmaMatchQuery = (lvar:LemmaVariant, generator:[string, string]):string => {
    const fn = posQueryFactory(generator[1]);
    return `[lemma="${escapeVal(lvar.lemma)}" & ${generator[0]}="${fn(lvar.pos)}"]`; // TODO escape stuff !!!
};


export const setQuery = (args:AnyQuery, q:string):void => {
    switch (args.queryselector) {
        case QuerySelector.BASIC:
            args.iquery = q;
        break;
        case QuerySelector.CQL:
            args.cql = q;
        break;
        case QuerySelector.LEMMA:
            args.lemma = q;
        break;
        case QuerySelector.WORD:
            args.word = q;
        break;
        case QuerySelector.PHRASE:
            args.phrase = q;
        break;
        default:
            throw new Error(`Unsupported query selector ${args.queryselector}`);
    }
}


export class ConcApi implements DataApi<RequestArgs, ConcResponse> {

    private readonly apiURL;

    private readonly customHeaders:HTTPHeaders;

    constructor(apiURL:string, customHeaders?:HTTPHeaders) {
        this.apiURL = apiURL;
        this.customHeaders = customHeaders || {};
    }

    call(args:RequestArgs|PCRequestArgs|FilterRequestArgs):Observable<ConcResponse> {
        return ajax$<ConcResponse>(
            'GET',
            this.apiURL,
            args,
            {headers: this.customHeaders}

        ).pipe(
            map(data => ({
                conc_persistence_op_id: data.conc_persistence_op_id,
                messages: data.messages,
                Lines: data.Lines,
                fullsize: data.fullsize,
                concsize: data.concsize,
                result_arf: data.result_arf,
                result_relative_freq: data.result_relative_freq,
                query: getQuery(args),
                corpname: args.corpname,
                usesubcorp: args.usesubcorp
            }))
        );
    }
}