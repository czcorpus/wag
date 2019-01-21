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
import { DataApi } from '../../abstract/types';

export interface QueryArgs {
    corpname:string;
    q:string;
    format:'json';
}

export interface DataItem {
    datetime:string;
    value:number;
}

export interface APIResponse {
    q:string;
    data:Array<DataItem>;
}

interface HTTPResponse {

}

export class TimeDistribAPI implements DataApi<QueryArgs, APIResponse> {

    private readonly apiURL:string;

    constructor(apiURL:string) {
        this.apiURL = apiURL;
    }

    call(queryArgs:QueryArgs):Rx.Observable<APIResponse> {
        return Rx.Observable.of({
            q: 'xxx?',
            data: [
                {datetime: '2000', value: 1000},
                {datetime: '2001', value: 1200},
                {datetime: '2002', value: 1500},
                {datetime: '2003', value: 1800},
                {datetime: '2004', value: 1731},
                {datetime: '2005', value: 2458},
                {datetime: '2006', value: 1107}
            ]
        }).timeout(2000);
    }

}
