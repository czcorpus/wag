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
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { ajax$ } from '../../common/ajax';
import { DataApi, HTTPHeaders } from '../../common/types';
import { QueryPoS, LemmaVariant } from '../../common/query';


export interface RequestArgs {
    lang:string;
    word:string;
    lemma:string;
    pos:QueryPoS;
    srchRange:number;
}

export interface FreqDBRow {
    word:string;
    lemma:string;
    pos:string;
    posLabel:string;
    abs:number;
    ipm:number;
    arf:number;
    flevel:number;
    isSearched:boolean;
}

export interface Response {
    result:Array<FreqDBRow>;
}

interface HTTPResponse {
    result:Array<LemmaVariant>;
}

export class FreqDbAPI implements DataApi<RequestArgs, Response> {

    private readonly apiURL:string;

    private readonly customHeaders:HTTPHeaders;

    constructor(apiURL:string, customHeaders?:HTTPHeaders) {
        this.apiURL = apiURL;
        this.customHeaders = customHeaders || {};
    }

    call(args:RequestArgs):Observable<Response> {
        return ajax$<HTTPResponse>(
            'GET',
            this.apiURL,
            {
                lang: args.lang,
                lemma: args.lemma,
                pos: args.pos,
                srchRange: args.srchRange
            },
            {headers: this.customHeaders}

        ).pipe(
            map(data => ({
                result: data.result.map(v => ({
                    word: args.word,
                    lemma: v.lemma,
                    pos: v.pos,
                    posLabel: v.pos,
                    abs: v.abs,
                    ipm: v.ipm,
                    arf: v.arf,
                    flevel: -1,
                    isSearched: v.lemma === args.lemma && v.pos === args.pos ? true : false
                }))
            }))
        );
    }
}

