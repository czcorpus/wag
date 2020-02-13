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
import { share, map } from 'rxjs/operators';

import { cachedAjax$ } from '../../ajax';
import { DataApi, HTTPHeaders, SourceDetails, IAsyncKeyValueStore } from '../../types';



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

export interface APIResponse extends SourceDetails {
    size:number;
    webURL:string;
    attrList:Array<{name:string, size:number}>;
    citationInfo:{
        article_ref:Array<string>;
        default_ref:string;
        other_bibliography:string;
    };
    structList:Array<{name:string; size:number}>;
}

export function isAPIResponse(v:SourceDetails):v is APIResponse {
    return 'size' in v && 'attrList' in v && 'structList' in v && 'citationInfo' in v;
}

export interface QueryArgs {
    tileId:number;
    corpname:string;
    format:'json';
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
        return cachedAjax$<HTTPResponse>(this.cache)(
            'GET',
            this.apiURL + '/corpora/ajax_get_corp_details',
            args,
            {headers: this.customHeaders}

        ).pipe(
            share(),
            map(
                (resp) => ({
                    tileId: args.tileId,
                    title: resp.corpname,
                    description: resp.description,
                    author: '', // TODO
                    size: resp.size,
                    webURL: resp.web_url,
                    attrList: resp.attrlist,
                    citationInfo: resp.citation_info,
                    structList: resp.structlist
                })
            )
        );
    }
}