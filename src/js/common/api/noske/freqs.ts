/*
 * Copyright 2020 Martin Zimandl <martin.zimandl@gmail.com>
 * Copyright 2020 Institute of the Czech National Corpus,
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

import { cachedAjax$ } from '../../ajax';
import { HTTPHeaders, IAsyncKeyValueStore, CorpusDetails } from '../../types';
import { CorpusInfoAPI } from './corpusInfo';
import { BacklinkWithArgs, Backlink } from '../../tile';
import { APIResponse, APIBlockResponse, IMultiBlockFreqDistribAPI, IFreqDistribAPI } from '../abstract/freqs';
import { SingleCritStateMixin, MultiCritStateMixin } from '../../models/freq';
import { HTTP, pipe, List } from 'cnc-tskit';

export enum FreqSort {
    REL = 'rel'
}

export interface HTTPResponse {
    request:{q:string};
    concsize:number;
    lastpage:number;
    paging:number;
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
        total:number;
        totalfrq:number;
    }>;
}

export interface SourceMappedDataRow {
    sourceId:string;
    error?:Error;
    name:string;
    freq:number;
    ipm:number;
    norm:number;
    order?:number;
    backlink:BacklinkWithArgs<BacklinkArgs>|null;
}




export interface BacklinkArgs {
    corpname:string;
    usesubcorp:string;
    q:Array<string>;
    fcrit:Array<string>;
    flimit:number;
    freq_sort:string;
    fpage:number;
}


interface CoreQueryArgs {
    corpname:string;
    usesubcorp?:string;
    pagesize?:number;
    q:Array<string>;
    flimit:number;
    freq_sort:string;
    fpage:number;
    format:'json';
}


export interface SingleCritQueryArgs extends CoreQueryArgs {
    fcrit:string;
}

/**
 * FreqDistribAPI represents a simplified variant where we ask
 * the API only for a single freq. distrib. criterium. It then
 * converts KonText's original response to a nicer form
 * (no multiple data blocks as they are not needed).
 */
export class NoskeFreqDistribAPI implements IFreqDistribAPI<SingleCritQueryArgs> {

    private readonly apiURL:string;

    private readonly customHeaders:HTTPHeaders;

    private readonly cache:IAsyncKeyValueStore;

    private readonly srcInfoService:CorpusInfoAPI;

    constructor(cache:IAsyncKeyValueStore, apiURL:string, customHeaders?:HTTPHeaders) {
        this.cache = cache;
        this.apiURL = apiURL;
        this.customHeaders = customHeaders || {};
        this.srcInfoService = new CorpusInfoAPI(cache, apiURL, customHeaders);
    }

    getSourceDescription(tileId:number, uiLang:string, corpname:string):Observable<CorpusDetails> {
        return this.srcInfoService.call({
            tileId: tileId,
            corpname: corpname,
            struct_attr_stats: 1,
            subcorpora: 1,
            format: 'json',
        });
    }

    createBacklink(state:SingleCritStateMixin, backlink:Backlink, concId:string):BacklinkWithArgs<BacklinkArgs> {
        return backlink ?
        {
            url: backlink.url,
            method: backlink.method || HTTP.Method.GET,
            label: backlink.label,
            args: {
                corpname: state.corpname,
                usesubcorp: null,
                q: pipe(
                    concId.split('&'),
                    List.map(v => v.split('=').slice(0, 2)),
                    List.filter(([k, v]) => k === 'q'),
                    List.map(([,v]) => decodeURIComponent(v.replace(/\++/g, ' ')))
                ),
                fcrit: [state.fcrit],
                flimit: state.flimit,
                freq_sort: state.freqSort,
                fpage: state.fpage
            }
        } :
        null;
    }

    stateToArgs(state:SingleCritStateMixin, concId:string, subcname?:string):SingleCritQueryArgs {
        return {
            corpname: state.corpname,
            usesubcorp: subcname,
            q: pipe(
                concId.split('&'),
                List.map(v => v.split('=').slice(0, 2)),
                List.filter(([k, v]) => k === 'q'),
                List.map(([,v]) => decodeURIComponent(v.replace(/\++/g, ' ')))
            ),
            fcrit: state.fcrit,
            flimit: state.flimit,
            freq_sort: state.freqSort,
            fpage: state.fpage,
            format: 'json'
        };
    }

    call(args:SingleCritQueryArgs):Observable<APIResponse> {
        return cachedAjax$<HTTPResponse>(this.cache)(
            'GET',
            this.apiURL + '/freqs',
            args,
            {headers: this.customHeaders}

        ).pipe(
            map<HTTPResponse, APIResponse>(resp => ({
                data: resp.Blocks[0].Items.map(v => ({
                        name: v.Word.map(v => v.n).join(' '),
                        freq: v.freq,
                        ipm: v.rel,
                        norm: v.norm
                })),
                concId: resp.request.q,
                corpname: args.corpname,
                usesubcorp: args.usesubcorp || null,
                concsize: resp.concsize
            }))
        );
    }
}

export interface MultiCritQueryArgs extends CoreQueryArgs {
    fcrit:Array<string>;
}

/**
 * MultiBlockFreqDistribAPI creates requests with multiple freq. distrib.
 * criteria.
 */
export class NoskeMultiBlockFreqDistribAPI implements IMultiBlockFreqDistribAPI<MultiCritQueryArgs> {

    private readonly apiURL:string;

    private readonly customHeaders:HTTPHeaders;

    private readonly cache:IAsyncKeyValueStore;

    private readonly srcInfoService:CorpusInfoAPI;

    constructor(cache:IAsyncKeyValueStore, apiURL:string, customHeaders?:HTTPHeaders) {
        this.cache = cache;
        this.apiURL = apiURL;
        this.customHeaders = customHeaders || {};
        this.srcInfoService = new CorpusInfoAPI(cache, apiURL, customHeaders);
    }

    getSourceDescription(tileId:number, uiLang:string, corpname:string):Observable<CorpusDetails> {
        return this.srcInfoService.call({
            tileId: tileId,
            corpname: corpname,
            struct_attr_stats: 1,
            subcorpora: 1,
            format: 'json',
        });
    }

    createBacklink(state:MultiCritStateMixin, backlink:Backlink, concId:string):BacklinkWithArgs<BacklinkArgs> {
        return backlink ?
        {
            url: backlink.url,
            method: backlink.method || HTTP.Method.GET,
            label: backlink.label,
            args: {
                corpname: state.corpname,
                usesubcorp: null,
                q: pipe(
                    concId.split('&'),
                    List.map(v => v.split('=').slice(0, 2)),
                    List.filter(([k, v]) => k === 'q'),
                    List.map(([,v]) => decodeURIComponent(v.replace(/\++/g, ' ')))
                ),
                fcrit: state.fcrit,
                flimit: state.flimit,
                freq_sort: state.freqSort,
                fpage: state.fpage
            }
        } :
        null;
    }

    stateToArgs(state:MultiCritStateMixin, concId:string, critIdx?:number, subcname?:string):MultiCritQueryArgs {
        return {
            corpname: state.corpname,
            usesubcorp: subcname,
            q: pipe(
                concId.split('&'),
                List.map(v => v.split('=').slice(0, 2)),
                List.filter(([k, v]) => k === 'q'),
                List.map(([,v]) => decodeURIComponent(v.replace(/\++/g, ' ')))
            ),
            fcrit: critIdx !== undefined ? [state.fcrit[critIdx]] : state.fcrit,
            flimit: state.flimit,
            freq_sort: state.freqSort,
            fpage: state.fpage,
            format: 'json'
        };
    }

    call(args:MultiCritQueryArgs):Observable<APIBlockResponse> {
        return cachedAjax$<HTTPResponse>(this.cache)(
            'GET',
            this.apiURL + '/freqs',
            args,
            {headers: this.customHeaders}

        ).pipe(
            map<HTTPResponse, APIBlockResponse>(
                resp => ({
                    blocks: resp.Blocks.map(block => ({
                        data: block.Items
                            .sort((x1, x2) => x2.freq - x1.freq)
                            .map((v,  i) => ({
                                name: v.Word.map(v => v.n).join(' '),
                                freq: v.freq,
                                ipm: v.rel,
                                norm: v.norm,
                                order: i
                            }))
                    })),
                    concId: resp.request.q,
                    corpname: args.corpname
                })
            )
        );
    }
}