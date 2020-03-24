/*
 * Copyright 2020 Tomas Machalek <tomas.machalek@gmail.com>
 * Copyright 2020 Institute of the Czech National Corpus,
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
import { share, map } from 'rxjs/operators';

import { cachedAjax$ } from '../../ajax';
import { DataApi, HTTPHeaders, SourceDetails, IAsyncKeyValueStore } from '../../types';



interface HTTPResponse {
}

export interface APIResponse extends SourceDetails {

}

export interface QueryArgs {
    tileId:number;
    corpname:string;
    format:'json';
}

export interface APIResponse extends SourceDetails {
    size:number;
    attrList:Array<{name:string, size:number}>;
    structList:Array<{name:string; size:number}>;
    keywords:Array<{name:string, color:string}>;
}

export class CorpusInfoAPI implements DataApi<QueryArgs, APIResponse> {

    private readonly apiURL:string;

    private readonly customHeaders:HTTPHeaders;

    private readonly cache:IAsyncKeyValueStore;

    constructor(cache:IAsyncKeyValueStore, apiURL:string, customHeaders?:HTTPHeaders) {
        this.cache = cache;
        this.apiURL = apiURL;
        this.customHeaders = customHeaders || {};
    }

    call(args:QueryArgs):Observable<APIResponse> {
        return null;
    }
}