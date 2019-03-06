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

import {Observable} from 'rxjs';
import {map} from 'rxjs/operators';
import { DataApi, HTTPHeaders } from '../../common/types';
import { ajax$ } from '../../common/ajax';
import {HTTPResponse} from '../../common/api/kontextFreqs';

export interface RequestArgs {
    corpname:string;
    q:string;
    fcrit:string; // e.g. 'lemma/e 0<0 pos/e 0<0'
    flimit:string;
    freq_sort:string;
    fpage:string;
    ftt_include_empty:string;
    format:'json';
}

export interface SummaryDataRow {
    lemma:string;
    pos:string;
    abs:number;
    ipm:number;
    flevel:number;
    percSimilarWords:number;

}

export interface Response {
    concId:string;
    data:Array<SummaryDataRow>;
}

export class LemmaFreqApi implements DataApi<RequestArgs, Response> {

    private readonly apiURL:string;

    private readonly customHeaders:HTTPHeaders;

    constructor(apiURL:string, customHeaders?:HTTPHeaders) {
        this.apiURL = apiURL;
        this.customHeaders = customHeaders || {};
    }

    call(args:RequestArgs):Observable<Response> {
        return ajax$<HTTPResponse>(
            'GET',
            this.apiURL,
            args,
            {headers: this.customHeaders}

        ).pipe(map(
            (data) => ({
                concId: data.conc_persistence_op_id,
                data: data.Blocks[0].Items.map(item => ({
                    lemma: item.Word[0].n,
                    pos: item.Word[1].n,
                    abs: item.freq,
                    ipm: -1,
                    flevel: -1,
                    percSimilarWords: -1
                }))
            })
        ));
    }
}