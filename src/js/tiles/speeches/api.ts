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

import { Observable, of as rxOf } from 'rxjs';
import { DataApi, IAsyncKeyValueStore, HTTPHeaders, HTTPMethod } from '../../common/types';
import { cachedAjax$ } from '../../common/ajax';
import { ConcDetailText } from './modelDomain';



export interface SpeechReqArgs {
    corpname:string;
    attrs:'word';
    attr_allpos:'all';
    ctxattrs:'word';
    pos:number;
    structs:string;
    hitlen?:number;
    detail_left_ctx?:number;
    detail_right_ctx?:number;
    format:'json';
}

export interface SpeechResponse {
    pos:number;
    content:ConcDetailText;
    expand_right_args:{detail_left_ctx:number; detail_right_ctx:number; pos:number}|null;
    expand_left_args:{detail_left_ctx:number; detail_right_ctx:number; pos:number}|null;
    widectx_globals:Array<[string, string]>;
    messages:Array<[string, string]>;
}

/**
 *
 */
export class SpeechesApi implements DataApi<SpeechReqArgs, SpeechResponse> {

    private readonly cache:IAsyncKeyValueStore;

    private readonly apiUrl:string;

    private readonly headers:HTTPHeaders;

    constructor(cache:IAsyncKeyValueStore, apiUrl:string, headers:HTTPHeaders) {
        this.cache = cache;
        this.apiUrl = apiUrl;
        this.headers = headers;
    }

    call(args:SpeechReqArgs):Observable<SpeechResponse> {
        if (args.pos !== undefined) {
            return cachedAjax$<SpeechResponse>(this.cache)(
                HTTPMethod.GET,
                this.apiUrl,
                args,
                {
                    headers: this.headers
                }
            );

        } else {
            return rxOf({
                pos: args.pos,
                content: [],
                expand_right_args: null,
                expand_left_args: null,
                widectx_globals: [],
                messages: []
            });
        }
    }
}