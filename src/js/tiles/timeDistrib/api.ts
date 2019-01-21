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
import {ajax$} from '../../shared/ajax';


// X-label, Y-label, abs, domain size
export type RawDataItem = [string, string, number, number];


export interface QueryArgs {
    corpname:string;
    q:string;
    ctfcrit1:string;
    ctfcrit2:string;
    ctattr1:string;
    ctattr2:string;
    ctminfreq:string;
    ctminfreq_type:string;
    format:'json';
}


export interface DataItem {
    datetime:string;
    abs:number;
    ipm:number;
}


export interface APIResponse {
    q:string;
    data:Array<DataItem>;
}


interface HTTPResponse {
    messages:Array<string>;
    data:{
        data:Array<RawDataItem>;
        full_size:number;
    };
}


const roundFloat = (v:number):number => Math.round(v * 100) / 100;


const calcIPM = (v:RawDataItem) => Math.round(v[2] / v[3] * 1e6 * 100) / 100;


/**
 *
 */
export class TimeDistribAPI implements DataApi<QueryArgs, APIResponse> {

    private readonly apiURL:string;

    constructor(apiURL:string) {
        this.apiURL = apiURL;
    }

    call(queryArgs:QueryArgs):Rx.Observable<APIResponse> {
        return ajax$<HTTPResponse>(
            'GET',
            this.apiURL,
            queryArgs

        ).concatMap<HTTPResponse, APIResponse>(
            (resp) => {
                return Rx.Observable.of({
                    q:null, // TODO
                    data: resp.data.data.map(row => ({
                        datetime: row[0],
                        abs: row[2],
                        ipm: calcIPM(row)
                    })).sort((a, b) => parseInt(a.datetime) - parseInt(b.datetime))
                });
            }
        );
    }

}
