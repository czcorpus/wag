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

import * as Rx from '@reactivex/rxjs';
import { DataApi } from '../../common/types';
import { ajax$ } from '../../common/ajax';
import { CollApiArgs, DataRow, DataHeading } from './common';


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

    constructor(apiURL:string) {
        this.apiURL = apiURL;
    }


    call(queryArgs:CollApiArgs):Rx.Observable<CollApiResponse> {
        return ajax$<HttpApiResponse>(
            'GET',
            this.apiURL,
            queryArgs,
            {}

        ).concatMap(
            (data) => Rx.Observable.of({
                concId: data.conc_persistence_op_id,
                collHeadings: data.Head.map(v => ({label: v.n, ident: v.s})),
                data: data.Items.map(item => ({
                    stats: item.Stats.map(v => parseFloat(v.s)),
                    freq: item.freq,
                    pfilter: item.pfilter,
                    nfilter: item.nfilter,
                    str: item.str,
                    wcFontSize: -1,
                    wcFontSizeMobile: -1
                }))
            })
        );
    }

}

