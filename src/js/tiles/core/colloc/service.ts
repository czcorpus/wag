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
import { Ident } from 'cnc-tskit';

import { cachedAjax$ } from '../../../page/ajax.js';
import { DataApi, IAsyncKeyValueStore } from '../../../types.js';
import { DataHeading, DataRow } from '../../../api/abstract/collocations.js';
import { CollApiArgs } from '../../../api/vendor/kontext/collocations.js';
import { IApiServices } from '../../../appServices.js';



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

    private readonly apiServices:IApiServices;

    private readonly cache:IAsyncKeyValueStore;

    constructor(cache:IAsyncKeyValueStore, apiURL:string, apiServices:IApiServices) {
        this.apiURL = apiURL;
        this.apiServices = apiServices;
        this.cache = cache;
    }


    call(queryArgs:CollApiArgs):Observable<CollApiResponse> {
        return cachedAjax$<HttpApiResponse>(this.cache)(
            'GET',
            this.apiURL,
            queryArgs,
            {
                headers: this.apiServices.getApiHeaders(this.apiURL),
                withCredentials: true
            }

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
                        interactionId: Ident.puid()
                    }))
                })
            )
        );
    }

}

