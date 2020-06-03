/*
 * Copyright 2019 Martin Zimandl <martin.zimandl@gmail.com>
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
import { map, flatMap } from 'rxjs/operators';

import { cachedAjax$ } from '../../../ajax';
import { HTTPHeaders, IAsyncKeyValueStore, CorpusDetails } from '../../../types';
import { CorpusInfoAPI } from './corpusInfo';
import { ConcApi, QuerySelector } from './concordance';
import { ViewMode } from '../../abstract/concordance';
import { QueryMatch } from '../../../query';
import { HTTPResponse } from './freqs';

export enum FreqSort {
    REL = 'rel'
}

export interface APIVariantsResponse {
    fcrit:string;
    fcritValues:Array<string>;
    concId:string;
}

export interface APILeafResponse {
    filter:{[attr:string]:string}
    data:Array<{name:string; value:number;}>;
    concId:string;
    corpname:string;
}


export interface BacklinkArgs {
    corpname:string;
    usesubcorp:string;
    q:string;
    fcrit:Array<string>;
    flimit:number;
    freq_sort:string;
    fpage:number;
    ftt_include_empty:number;
}


interface CoreQueryArgs {
    corpname:string;
    pagesize?:number;
    flimit:number;
    fpage:number;
    ftt_include_empty:number;
    format:'json';
}


export interface SingleCritQueryArgs extends CoreQueryArgs {
    fcrit:string;
}

export interface WordDataApi<T, U> {
    call(queryArgs:T, concId:string, filter:{[attr:string]:string}):Observable<U>;
}

export class FreqTreeAPI implements WordDataApi<SingleCritQueryArgs, APILeafResponse> {

    private readonly apiURL:string;

    private readonly concApiFilter:ConcApi;

    private readonly customHeaders:HTTPHeaders;

    private readonly cache:IAsyncKeyValueStore;

    private readonly srcInfoService:CorpusInfoAPI;

    constructor(cache:IAsyncKeyValueStore, apiURL:string, customHeaders?:HTTPHeaders) {
        this.cache = cache;
        this.concApiFilter = new ConcApi(true, cache, apiURL, customHeaders);
        this.apiURL = apiURL;
        this.customHeaders = customHeaders || {};
        this.srcInfoService = new CorpusInfoAPI(cache, apiURL, customHeaders);
    }

    getSourceDescription(tileId:number, lang:string, corpname:string):Observable<CorpusDetails> {
        return this.srcInfoService.call({
            tileId: tileId,
            corpname: corpname,
            format: 'json'
        });
    }

    callVariants(args:SingleCritQueryArgs, lemma:QueryMatch, concId: string):Observable<APIVariantsResponse> {
        return cachedAjax$<HTTPResponse>(this.cache)(
            'GET',
            this.apiURL + '/freqs',
            {...args, q: `~${concId}`},
            {headers: this.customHeaders}
        ).pipe(
            map<HTTPResponse, APIVariantsResponse>(resp => ({
                lemma: lemma,
                fcrit: args.fcrit,
                fcritValues: resp.Blocks.map(block =>
                    block.Items.map(v =>
                        v.Word.map(v => v.n).join(' ')
                    )
                ).reduce((acc,curr) => [...acc, ...curr], []),
                concId: resp.conc_persistence_op_id
            }))
        );
    }

    call(args:SingleCritQueryArgs, concId:string, filter:{[attr:string]:string}):Observable<APILeafResponse> {
        return this.concApiFilter.call({
            corpname: args.corpname,
            queryselector: QuerySelector.CQL,
            q: `~${concId}`,
            q2: `p0 0 1 [] within ${Object.entries(filter).map(([key, value]) => `<${key.split('.')[0]} ${key.split('.')[1].split(' ')[0]}="${value}"/>`).join(' & ')}`,
            kwicleftctx: '0',
            kwicrightctx: '0',
            async: '0',
            pagesize: '0',
            fromp: '1',
            attr_vmode: 'mouseover',
            attrs: 'word',
            viewmode: ViewMode.KWIC,
            shuffle: 0,
            format:'json'
        }).pipe(flatMap(x =>
            cachedAjax$<HTTPResponse>(this.cache)(
                'GET',
                this.apiURL + '/freqs',
                {...args, q: `~${x.concPersistenceID}`},
                {headers: this.customHeaders}
            ).pipe(
                map<HTTPResponse, APILeafResponse>(
                    resp => ({
                        filter: filter,
                        data: resp.Blocks.map(block =>
                            block.Items.map(v => ({
                                name: v.Word.map(v => v.n).join(' '),
                                value: v.rel
                            }))
                        ).reduce((acc,curr) => [...acc, ...curr], []),
                        concId: resp.conc_persistence_op_id,
                        corpname: args.corpname
                    })
                )
            )
        ))
    }
}