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

import { ajax$ } from '../../common/ajax';
import { DataApi, HTTPHeaders } from '../../common/types';


export interface RequestArgs {
    word:string;
    srchRange:number;
}

export interface SimilarlyFreqWord {
    word:string;
    abs:number;
    ipm:number;
    highlighted?:boolean;
}

export interface Response {
    result:Array<SimilarlyFreqWord>;
}

export class SimilarFreqWordsApi implements DataApi<RequestArgs, Response> {

    private readonly apiURL:string;

    private readonly customHeaders:HTTPHeaders;

    constructor(apiURL:string, customHeaders?:HTTPHeaders) {
        this.apiURL = apiURL;
        this.customHeaders = customHeaders || {};
    }

    call(args:RequestArgs):Observable<Response> {
        return ajax$(
            'GET',
            this.apiURL,
            {
                word: args.word,
                srchRange: args.srchRange
            },
            {headers: this.customHeaders}
        );
    }
}

