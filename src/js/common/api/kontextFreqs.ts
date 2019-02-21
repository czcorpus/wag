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
import {ajax$} from '../ajax';
import { DataApi } from '../types';


export interface HTTPResponse {
    conc_persistence_op_id:string;
    Blocks:Array<{
        Head:Array<{s:string; n:string}>;
        Items:Array<{
            Word:Array<{n:string}>;
            fbar:number;
            freq:number;
            freqbar:number;
            nbar:number;
            nfilter:Array<[string, string]>;
            pfilter:Array<[string, string]>;
            rel:number;
            relbar:number;
        }>;
        Total:number;
        TotalPages:number;
    }>;
}


export interface DataRow {
    name:string;
    freq:number;
    ipm:number;
}

export interface APIResponse {
    concId:string;
    corpname:string;
    data:Array<DataRow>;
}

export interface ApiDataBlock {
    data:Array<DataRow>;
}

export interface APIBlockResponse {
    concId:string;
    corpname:string;
    blocks:Array<ApiDataBlock>;
}

export interface QueryArgs {
    corpname:string;
    q:string;
    fcrit:Array<string>;
    flimit:string;
    freq_sort:string;
    fpage:string;
    ftt_include_empty:string;
    format:'json';
}

export class FreqDistribAPI implements DataApi<QueryArgs, APIResponse> {

    private readonly apiURL:string;

    constructor(apiURL:string) {
        this.apiURL = apiURL;
    }

    call(args:QueryArgs):Rx.Observable<APIResponse> {
        return ajax$<HTTPResponse>(
            'GET',
            this.apiURL,
            args

        ).concatMap<HTTPResponse, APIResponse>(
            resp => Rx.Observable.of({
                data: resp.Blocks[0].Items.map(v => ({
                        name: v.Word.map(v => v.n).join(' '),
                        freq: v.freq,
                        ipm: v.rel
                })),
                concId: resp.conc_persistence_op_id,
                corpname: args.corpname
            })
        );
    }
}


export class MultiBlockFreqDistribAPI implements DataApi<QueryArgs, APIBlockResponse> {

    private readonly apiURL:string;

    constructor(apiURL:string) {
        this.apiURL = apiURL;
    }

    call(args:QueryArgs):Rx.Observable<APIBlockResponse> {
        return ajax$<HTTPResponse>(
            'GET',
            this.apiURL,
            args

        ).concatMap<HTTPResponse, APIBlockResponse>(
            resp => Rx.Observable.of({
                blocks: resp.Blocks.map(block => ({
                    data: block.Items.map(v => ({
                        name: v.Word.map(v => v.n).join(' '),
                        freq: v.freq,
                        ipm: v.rel
                    }))
                })),
                concId: resp.conc_persistence_op_id,
                corpname: args.corpname
            })
        );
    }
}