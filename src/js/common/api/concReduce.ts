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
import {map} from 'rxjs/operators';
import {ajax$} from '../ajax';
import { DataApi, HTTPHeaders } from '../types';
import { ConcResponse, getQuery, AnyQuery } from './concordance';


export interface RequestArgs extends AnyQuery {
    corpname:string;
    usesubcorp:string;
    rlines:number;
    q:string;
    format:'json';
}


export interface ApiResponse extends ConcResponse {
    rlines:number;
}


export class ConcReduceApi implements DataApi<RequestArgs, ApiResponse> {

    private readonly apiURL:string;

    private readonly customHeaders:HTTPHeaders;

    constructor(apiURL:string, customHeaders?:HTTPHeaders) {
        this.apiURL = apiURL;
        this.customHeaders = customHeaders || {};
    }

    call(args:RequestArgs):Observable<ApiResponse> {
        return ajax$<ApiResponse>(
            'GET',
            this.apiURL,
            args,
            {headers: this.customHeaders}

        ).pipe(
            map(data => ({
                conc_persistence_op_id: data.conc_persistence_op_id,
                messages: data.messages,
                Lines: data.Lines,
                fullsize: data.fullsize,
                concsize: data.concsize,
                rlines: args.rlines,
                result_arf: data.result_arf,
                result_relative_freq: data.result_relative_freq,
                query: getQuery(args),
                corpname: args.corpname,
                usesubcorp: args.usesubcorp
            }))
        );
    }
}
