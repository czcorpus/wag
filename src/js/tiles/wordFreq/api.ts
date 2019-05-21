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

import { cachedAjax$ } from '../../common/ajax';
import { DataApi, HTTPHeaders, IAsyncKeyValueStore } from '../../common/types';
import { QueryPoS, LemmaVariant, matchesPos } from '../../common/query';
import { MultiDict } from '../../common/data';


export interface RequestArgs {
    lang:string;
    word:string;
    lemma:string;
    pos:Array<QueryPoS>;
    srchRange:number;
}

export interface FreqDBRow {
    word:string;
    lemma:string;
    pos:Array<{value:QueryPoS; label:string}>;
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

    private readonly cache:IAsyncKeyValueStore;

    constructor(cache:IAsyncKeyValueStore, apiURL:string, customHeaders?:HTTPHeaders) {
        this.cache = cache;
        this.apiURL = apiURL;
        this.customHeaders = customHeaders || {};
    }

    call(args:RequestArgs):Observable<Response> {
        return cachedAjax$<HTTPResponse>(this.cache)(
            'GET',
            this.apiURL,
            new MultiDict([
                ['lang', args.lang],
                ['lemma', args.lemma],
                ...args.pos.map(p => ['pos', p] as [string, QueryPoS]),
                ['srchRange', args.srchRange]
            ]),
            {headers: this.customHeaders}

        ).pipe(
            map(data => ({
                result: data.result.map(v => ({
                    word: v.word,
                    lemma: v.lemma,
                    pos: v.pos,
                    abs: v.abs,
                    ipm: v.ipm,
                    arf: v.arf,
                    flevel: -1,
                    isSearched: v.lemma === args.lemma && matchesPos(v, args.pos) ? true : false
                }))
            }))
        );
    }
}

