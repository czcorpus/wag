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

import { cachedAjax$ } from '../../../common/ajax';
import { DataApi, HTTPHeaders, IAsyncKeyValueStore } from '../../../common/types';
import { QueryPoS, QueryMatch, matchesPos } from '../../../common/query';
import { MultiDict } from '../../../common/data';


export interface RequestArgs {
    lang:string;
    word:string;
    lemma:string;
    pos:Array<QueryPoS>;
    srchRange:number;
}

export type FreqBand = 1|2|3|4|5;

export interface FreqDBRow {
    word:string;
    lemma:string;
    pos:Array<{value:QueryPoS; label:string}>;
    abs:number;
    ipm:number;
    arf:number;
    flevel:FreqBand|null;
    isSearched:boolean;
}

export interface Response {
    result:Array<FreqDBRow>;
}

interface HTTPResponse {
    result:Array<QueryMatch>;
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
                ['word', args.word],
                ['lemma', args.lemma],
                ['pos', args.pos.join(',')],
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
                    flevel: null,
                    isSearched: v.lemma === args.lemma && matchesPos(v, args.pos) ? true : false
                }))
            }))
        );
    }
}

