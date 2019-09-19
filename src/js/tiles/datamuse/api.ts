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
import { cachedAjax$ } from '../../common/ajax';
import { DataApi, HTTPHeaders, IAsyncKeyValueStore } from '../../common/types';

export interface DatamuseWord {
    word:string;
    score:number;
    tags:Array<string>;
}

export type DatamuseMLApiResponse = Array<DatamuseWord>;


export interface DatamuseMLApiArgs {
    ml:string;
    max:number;
}

export interface DatamuseSLApiArgs {
    sl:string;
    max:number;
}

export type DatamuseApiArgs = DatamuseMLApiArgs | DatamuseSLApiArgs;


export class DatamuseMLApi implements DataApi<DatamuseApiArgs, DatamuseMLApiResponse> {

    private readonly apiURL:string;

    private readonly customHeaders:HTTPHeaders;

    private readonly cache:IAsyncKeyValueStore;

    constructor(cache:IAsyncKeyValueStore, apiURL:string, customHeaders?:HTTPHeaders) {
        this.apiURL = apiURL;
        this.customHeaders = customHeaders || {};
        this.cache = cache;
    }


    call(queryArgs:DatamuseApiArgs):Observable<DatamuseMLApiResponse> {
        return cachedAjax$<DatamuseMLApiResponse>(this.cache)(
            'GET',
            this.apiURL,
            queryArgs,
            {headers: this.customHeaders}

        );
    }

}

