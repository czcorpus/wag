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
import { map, flatMap, tap } from 'rxjs/operators';

import { cachedAjax$ } from '../../ajax';
import { HTTPHeaders, IAsyncKeyValueStore } from '../../types';
import { CorpusInfoAPI, APIResponse as CorpusInfoApiResponse } from './corpusInfo';
import { ConcApi, QuerySelector } from './concordance';
import { ViewMode } from '../abstract/concordance';
import { LemmaVariant } from '../../query';

export enum FreqSort {
    REL = 'rel'
}

export interface HTTPResponse {
    conc_persistence_op_id:string;
    concsize:number;
    Blocks:Array<{
        Head:Array<{s:string; n:string}>;
        Items:Array<{
            Word:Array<{n:string}>;
            fbar:number;
            freq:number;
            freqbar:number;
            nbar:number;
            norm:number;
            nfilter:Array<[string, string]>;
            pfilter:Array<[string, string]>;
            rel:number;
            relbar:number;
        }>;
        Total:number;
        TotalPages:number;
    }>;
}

export interface DataTree {
    name:string;
    children:Array<{
        name:string;
        children:Array<DataRow>
    }>
}

export interface DataRow {
    name:string;
    value:number;
}

export interface ApiDataBlock {
    data:Array<DataRow>;
}

export interface APIBlockResponse {
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
    freq_sort:string;
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

export interface CritVariantsResponse {
    lemma:LemmaVariant;
    fcrit:string;
    fcritValues:Array<string>;
    concId:string;
}

export class FreqComparisonAPI implements WordDataApi<SingleCritQueryArgs, APIBlockResponse> {

    private readonly apiURL:string;

    private readonly concApi:ConcApi;
    
    private readonly concApiFilter:ConcApi;

    private readonly customHeaders:HTTPHeaders;

    private readonly cache:IAsyncKeyValueStore;

    private readonly srcInfoService:CorpusInfoAPI;

    constructor(cache:IAsyncKeyValueStore, apiURL:string, customHeaders?:HTTPHeaders) {
        this.cache = cache;
        this.concApi = new ConcApi(false, cache, apiURL, customHeaders);
        this.concApiFilter = new ConcApi(true, cache, apiURL, customHeaders);
        this.apiURL = apiURL;
        this.customHeaders = customHeaders || {};
        this.srcInfoService = new CorpusInfoAPI(cache, apiURL, customHeaders);
    }

    getSourceDescription(tileId:number, uiLang:string, corpname:string):Observable<CorpusInfoApiResponse> {
        return this.srcInfoService.call({
            tileId: tileId,
            corpname: corpname,
            format: 'json'
        });
    }

    prepareCQL(lemma:LemmaVariant):string {
        if (lemma.isNonDict) {
            const words = lemma.word.split(' ')
            return words.map(part => `[word="${part}"]`).join('')
        } else {
            const posPart = lemma.pos.length > 0 ? ' & (' + lemma.pos.map(v => `pos="${v.value}"`).join(' | ') + ')' : '';
            return `[word="${lemma.word}" ${posPart}]`
        }
    }

    callVariants(args:SingleCritQueryArgs, lemma:LemmaVariant):Observable<CritVariantsResponse> {
        return this.concApi.call({
            corpname: args.corpname,
            queryselector: QuerySelector.CQL,
            cql: this.prepareCQL(lemma),
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
                map(resp => ({
                    lemma: lemma,
                    fcrit: args.fcrit,
                    fcritValues: resp.Blocks.map(block =>
                        block.Items.map(v =>
                            v.Word.map(v => v.n).join(' ')
                        )
                    ).reduce((acc,curr) => [...acc, ...curr], []),
                    concId: resp.conc_persistence_op_id
                }))
            )
        ))
    }

    call(args:SingleCritQueryArgs, concId:string, filter:{[attr:string]:string}):Observable<APIBlockResponse> {
        return this.concApiFilter.call({
            corpname: args.corpname,
            queryselector: QuerySelector.CQL,
            q: `~${concId}`,
            q2: `p0 0 1 [] within <doc ${Object.entries(filter).map(([key, value]) => `${key.split(' ')[0].replace('doc.', '')}="${value}"`).join(' & ')}/>`,
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
                map<HTTPResponse, APIBlockResponse>(
                    resp => ({
                        filter: filter,
                        data: resp.Blocks.map(block => 
                            block.Items.map(v => ({
                                name: v.Word.map(v => v.n).join(' '),
                                value: v.freq
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