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
import { map } from 'rxjs/operators';

import { ajax$ } from '../../../ajax';
import { DataApi, HTTPHeaders } from '../../../types';
import { AnyQuery, getQuery, HTTPResponse, convertLines } from './concordance';
import { ConcResponse } from '../../abstract/concordance';



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
        return ajax$<HTTPResponse>(
            'GET',
            this.apiURL + '/reduce',
            args,
            {headers: this.customHeaders}

        ).pipe(
            map(data => ({
                concPersistenceID: data.conc_persistence_op_id,
                messages: data.messages,
                lines: convertLines(data.Lines),
                concsize: data.concsize,
                rlines: args.rlines,
                arf: data.result_arf,
                ipm: data.result_relative_freq,
                query: getQuery(args),
                corpName: args.corpname,
                subcorpName: args.usesubcorp
            }))
        );
    }
}
