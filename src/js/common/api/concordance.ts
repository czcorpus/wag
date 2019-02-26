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

import {Observable} from 'rxjs/Observable';
import {map} from 'rxjs/operators/map';
import {ajax$} from '../ajax';
import { DataApi } from '../types';

export enum QuerySelector {
    BASIC = 'iqueryrow',
    CQL = 'cqlrow',
    LEMMA = 'lemmarow',
    WORD = 'wordrow'
}

export enum ViewMode {
    KWIC = 'kwic',
    SENT = 'sen'
}

export interface AnyQuery {
    queryselector:QuerySelector;
    usesubcorp?:string;
    iquery?:string;
    lemma?:string;
    cql?:string;
    word?:string;
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
    format:'json';
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
    toknum:number;
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
        default:
            throw new Error(`Unsupported query selector ${args.queryselector}`);
    }
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
        default:
            throw new Error(`Unsupported query selector ${args.queryselector}`);
    }
}


export class ConcApi implements DataApi<RequestArgs, ConcResponse> {

    private readonly apiURL;

    constructor(apiURL:string) {
        this.apiURL = apiURL;
    }

    call(args:RequestArgs):Observable<ConcResponse> {
        return ajax$<ConcResponse>(
            'GET',
            this.apiURL,
            args

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