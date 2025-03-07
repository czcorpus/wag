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

import { ajax$ } from '../../../page/ajax.js';
import { DataApi } from '../../../types.js';
import { ConcResponse } from '../../abstract/concordance.js';
import { IApiServices } from '../../../appServices.js';
import { HTTP } from 'cnc-tskit';
import { convertLines, ConcViewResponse } from './concordance/v015/common.js';



export interface RequestArgs {
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

    private readonly apiServices:IApiServices;

    constructor(apiURL:string, apiServices:IApiServices) {
        this.apiURL = apiURL;
        this.apiServices = apiServices;
    }

    call(tileId:number, args:RequestArgs):Observable<ApiResponse> {
        const headers = this.apiServices.getApiHeaders(this.apiURL);
        headers['X-Is-Web-App'] = '1';
        return ajax$<ConcViewResponse>(
            HTTP.Method.POST
            ,
            this.apiURL + '/reduce',
            args,
            {
                headers,
                withCredentials: true
            }

        ).pipe(
            map(data => ({
                concPersistenceID: data.conc_persistence_op_id,
                messages: data.messages,
                lines: convertLines(data.Lines),
                concsize: data.concsize,
                rlines: args.rlines,
                arf: data.result_arf,
                ipm: data.result_relative_freq,
                query: args.q, // TODO !!!!
                corpName: args.corpname,
                subcorpName: args.usesubcorp
            }))
        );
    }
}
