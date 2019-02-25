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

import {Observable} from 'rxjs';
import {ajax$} from '../ajax';
import { DataApi } from '../types';


interface HTTPResponse {
    corpname:string;
    description:string;
    size:number;
    web_url:string;
    attrlist:Array<{name:string, size:number}>;
    citation_info:{
        article_ref:Array<string>;
        default_ref:string;
        other_bibliography:string;
    };
    structlist:Array<{name:string; size:number}>;
    messages:Array<any>; // TODO
}

export type APIResponse = HTTPResponse;

export interface QueryArgs {
    corpname:string;
    format:'json';
}

export class CorpusInfoAPI implements DataApi<QueryArgs, APIResponse> {

    private readonly apiURL:string;

    private readonly cache:{[corp:string]:HTTPResponse};

    constructor(apiURL:string) {
        this.apiURL = apiURL;
        this.cache = {};
    }

    call(args:QueryArgs):Observable<APIResponse> {
        if (args.corpname in this.cache) {
            return Observable.of(this.cache[args.corpname]);

        } else {
            const ans = ajax$<HTTPResponse>(
                'GET',
                this.apiURL,
                args
            ).share();
            ans.subscribe(
                (data) => {
                    this.cache[args.corpname] = data;
                }
            );
            return ans;
        }

    }
}