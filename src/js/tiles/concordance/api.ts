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

import * as Rx from '@reactivex/rxjs';
import {ajax$} from '../../shared/ajax';
import { DataApi } from '../../abstract/types';

export enum QuerySelectors {
    BASIC = 'iqueryrow',
    CQL = 'cqlrow',
}

export interface RequestArgs {
    corpname:string;
    query:string;
    queryselector:QuerySelectors;
}

export interface Line {
    Left:Array<{'class':string, str:string}>;
    Kwic:Array<{'class':string, str:string}>;
    Right:Array<{'class':string, str:string}>;
    toknum:number;
}

export interface ConcResponse {
    conc_persistence_op_id:string;
    messages:Array<[string, string]>;
    Lines:Array<Line>;
    fullsize:number;
    concsize:number;
    result_arf:number;
    result_relative_freq:number;
}


export class RequestBuilder implements DataApi<RequestArgs, ConcResponse> {

    private readonly apiURL;

    constructor(apiURL:string) {
        this.apiURL = apiURL;
    }

    call(args:RequestArgs):Rx.Observable<ConcResponse> {
        return ajax$(
            'GET',
            this.apiURL,
            {
                corpname: args.corpname,
                queryselector: args.queryselector,
                iquery: args.query,
                async: 0,
                pagesize: 20,
                format: 'json'
            },
            {}
        );
    }
}