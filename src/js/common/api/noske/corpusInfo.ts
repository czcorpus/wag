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
import { DataApi, HTTPHeaders, SourceDetails, IAsyncKeyValueStore, CorpusDetails } from '../../types';
import { HTTPApiResponse } from './common';
import { List } from 'cnc-tskit';



interface HTTPResponse extends HTTPApiResponse {
    gramrels:Array<any>;
    diachronic:any;
    encoding:string;
    unicameral:boolean;
    aligned_details:Array<any>;
    alsizes:Array<number>;
    termdef:string;
    newversion:string;
    wsattr:string;
    wsdef:string;
    is_error_corpus:boolean;
    subcorpora:Array<string>;
    infohref:string;
    lposlist:Array<string>;
    compiled:string;
    structures:Array<{
        name:string;
        label:string;
        attributes:Array<{
            fromattr:string;
            dynamic:string;
            name:string;
            label:string;
        }>;
    }>;
    info:string;
    wsposlist:Array<string>;
    freqttattrs:Array<string>;
    tagsetdoc:string;
    aligned:Array<string>;
    structs:Array<[
        string,
        number,
        Array<[string, string, number]>
    ]>;
    wposlist:Array<[string, string]>;
    lang:string;
    docstructure:string;
    name:string;
    shortref:string;
    righttoleft:boolean;
    sizes:{
        tokencount:string; // oh yeah, the types are just like this
        sentcount:string;
        wordcount:string;
        normsum:string;
        parcount:string;
        doccount:string;
    };
    request:{[k:string]:string|boolean|number};
    attributes:Array<{
        fromattr:string;
        id_range:number;
        dynamic:string;
        name:string;
        label:string;
    }>;
    subcorpattrs:Array<string>;
    maxdetail:number;
    errsetdoc:string;
}

export interface QueryArgs {
    tileId:number;
    corpname:string;
    struct_attr_stats:1;
    subcorpora:1;
    format:'json';
}


export class CorpusInfoAPI implements DataApi<QueryArgs, SourceDetails> {

    private readonly apiURL:string;

    private readonly customHeaders:HTTPHeaders;

    private readonly cache:IAsyncKeyValueStore;

    constructor(cache:IAsyncKeyValueStore, apiURL:string, customHeaders?:HTTPHeaders) {
        this.cache = cache;
        this.apiURL = apiURL;
        this.customHeaders = customHeaders || {};
    }

    call(args:QueryArgs):Observable<CorpusDetails> {
        return cachedAjax$<HTTPResponse>(this.cache)(
            'GET',
            this.apiURL + '/corp_info',
            args,
            {headers: this.customHeaders}

        ).pipe(
            share(),
            map(
                (resp) => ({
                    tileId: args.tileId,
                    title: resp.name,
                    description: resp.info,
                    author: '',
                    size: parseInt(resp.sizes.tokencount),
                    webURL: '',
                    attrList: List.map(
                        v => ({
                            name: v.label,
                            size: v.id_range
                        }),
                        resp.attributes
                    ),
                    structList: List.map(
                        ([label, size,]) => ({
                            name: label,
                            size: size
                        }),
                        resp.structs
                    ),
                    keywords: []
                })
            )
        );
    }
}