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
import { puid } from '../../../common/util';
import { DataHeading, DataRow } from '../../../common/api/abstract/collocations';
import { CollApiArgs } from '../../../common/api/kontext/collocations';



type ResponseDataHeading = Array<{
    s:string;
    n:string;
}>;

interface ResponseDataRow {
    Stats:Array<{s:string}>;
    freq:number;
    nfilter:[string, string];
    pfilter:[string, string];
    str:string;
}


interface HttpApiResponse {
    conc_persistence_op_id:string;
    Head:ResponseDataHeading;
    Items:Array<ResponseDataRow>;
}

export interface CollApiResponse {
    concId:string;
    collHeadings:DataHeading;
    data:Array<DataRow>;
}


export class KontextCollAPI implements DataApi<CollApiArgs, CollApiResponse> {

    private readonly apiURL:string;

    private readonly customHeaders:HTTPHeaders;

    private readonly cache:IAsyncKeyValueStore;

    constructor(cache:IAsyncKeyValueStore, apiURL:string, customHeaders?:HTTPHeaders) {
        this.apiURL = apiURL;
        this.customHeaders = customHeaders || {};
        this.cache = cache;
    }


    call(queryArgs:CollApiArgs):Observable<CollApiResponse> {
        return cachedAjax$<HttpApiResponse>(this.cache)(
            'GET',
            this.apiURL,
            queryArgs,
            {headers: this.customHeaders}

        ).pipe(
            map(
                data => ({
                    concId: data.conc_persistence_op_id,
                    collHeadings: data.Head.map(v => ({label: v.n, ident: v.s})),
                    data: data.Items.map(item => ({
                        stats: item.Stats.map(v => parseFloat(v.s)),
                        freq: item.freq,
                        pfilter: item.pfilter,
                        nfilter: item.nfilter,
                        str: item.str,
                        interactionId: puid()
                    }))
                })
            )
        );
    }

}

