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

import { cachedAjax$ } from '../../../page/ajax';
import { IAsyncKeyValueStore, CorpusDetails } from '../../../types';
import { CorpusInfoAPI } from './corpusInfo';
import { BacklinkWithArgs, Backlink } from '../../../page/tile';
import { APIResponse, APIBlockResponse, IMultiBlockFreqDistribAPI, IFreqDistribAPI } from '../../abstract/freqs';
import { MinSingleCritFreqState, MinMultiCritFreqState } from '../../../models/tiles/freq';
import { HTTP, List, pipe } from 'cnc-tskit';
import { IApiServices } from '../../../appServices';

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
    q:string;
    fcrit:Array<string>;
    freq_type?:'tokens'|'text-types';
    flimit:number;
    freq_sort:string;
    fpage:number;
    ftt_include_empty:number;
}


interface CoreQueryArgs {
    corpname:string;
    usesubcorp?:string;
    pagesize?:number;
    q:string;
    flimit:number;
    freq_sort:string;
    fpage:number;
    ftt_include_empty:number;
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
export class KontextFreqDistribAPI implements IFreqDistribAPI<SingleCritQueryArgs> {

    private readonly apiURL:string;

    private readonly apiServices:IApiServices;

    private readonly cache:IAsyncKeyValueStore;

    private readonly srcInfoService:CorpusInfoAPI;

    constructor(cache:IAsyncKeyValueStore, apiURL:string, apiServices:IApiServices) {
        this.cache = cache;
        this.apiURL = apiURL;
        this.apiServices = apiServices;
        this.srcInfoService = new CorpusInfoAPI(cache, apiURL, apiServices);
    }

    getSourceDescription(tileId:number, lang:string, corpname:string):Observable<CorpusDetails> {
        return this.srcInfoService.call({
            tileId: tileId,
            corpname: corpname,
            format: 'json'
        });
    }

    createBacklink(state:MinSingleCritFreqState, backlink:Backlink, concId:string):BacklinkWithArgs<BacklinkArgs> {
        return backlink ?
        {
            url: backlink.url,
            method: backlink.method || HTTP.Method.GET,
            label: backlink.label,
            args: {
                corpname: state.corpname,
                usesubcorp: null,
                q: `~${concId}`,
                fcrit: [state.fcrit],
                freq_type: state.freqType,
                flimit: state.flimit,
                freq_sort: state.freqSort,
                fpage: state.fpage,
                ftt_include_empty: state.fttIncludeEmpty ? 1 : 0
            }
        } :
        null;
    };

    stateToArgs(state:MinSingleCritFreqState, concId:string, subcname?:string):SingleCritQueryArgs {
        return {
            corpname: state.corpname,
            usesubcorp: subcname,
            q: `~${concId ? concId : state.concId}`,
            fcrit: state.fcrit,
            flimit: state.flimit,
            freq_sort: state.freqSort,
            fpage: state.fpage,
            ftt_include_empty: state.fttIncludeEmpty ? 1 : 0,
            format: 'json'
        };
    }

    call(args:SingleCritQueryArgs):Observable<APIResponse> {
        return cachedAjax$<HTTPResponse>(this.cache)(
            'GET',
            this.apiURL + '/freqs',
            args,
            {headers: this.apiServices.getApiHeaders(this.apiURL)}

        ).pipe(
            map<HTTPResponse, APIResponse>(resp => ({
                data: resp.Blocks[0].Items.map(v => ({
                        name: v.Word.map(v => v.n).join(' '),
                        freq: v.freq,
                        ipm: v.rel,
                        norm: v.norm
                })),
                concId: resp.conc_persistence_op_id,
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
export class KontextMultiBlockFreqDistribAPI implements IMultiBlockFreqDistribAPI<MultiCritQueryArgs> {

    private readonly apiURL:string;

    private readonly apiServices:IApiServices;

    private readonly cache:IAsyncKeyValueStore;

    private readonly srcInfoService:CorpusInfoAPI;

    constructor(cache:IAsyncKeyValueStore, apiURL:string, apiServices:IApiServices) {
        this.cache = cache;
        this.apiURL = apiURL;
        this.apiServices = apiServices;
        this.srcInfoService = new CorpusInfoAPI(cache, apiURL, apiServices);
    }

    getSourceDescription(tileId:number, lang:string, corpname:string):Observable<CorpusDetails> {
        return this.srcInfoService.call({
            tileId: tileId,
            corpname: corpname,
            format: 'json'
        });
    }

    createBacklink(state:MinMultiCritFreqState, backlink:Backlink, concId:string):BacklinkWithArgs<BacklinkArgs> {
        return backlink ?
        {
            url: backlink.url,
            method: backlink.method || HTTP.Method.GET,
            label: backlink.label,
            args: {
                corpname: state.corpname,
                usesubcorp: null,
                q: `~${concId}`,
                fcrit: state.fcrit,
                freq_type: state.freqType,
                flimit: state.flimit,
                freq_sort: state.freqSort,
                fpage: state.fpage,
                ftt_include_empty: state.fttIncludeEmpty ? 1 : 0
            }
        } :
        null;
    };

    stateToArgs(state:MinMultiCritFreqState, concId:string, critIdx?:number, subcname?:string):MultiCritQueryArgs {
        return {
            corpname: state.corpname,
            usesubcorp: subcname,
            q: `~${concId ? concId : state.concId}`,
            fcrit: critIdx !== undefined ? [state.fcrit[critIdx]] : state.fcrit,
            flimit: state.flimit,
            freq_sort: state.freqSort,
            fpage: state.fpage,
            ftt_include_empty: state.fttIncludeEmpty ? 1 : 0,
            format: 'json'
        };
    }

    call(args:MultiCritQueryArgs):Observable<APIBlockResponse> {
        return cachedAjax$<HTTPResponse>(this.cache)(
            'GET',
            this.apiURL + '/freqs',
            args,
            {headers: this.apiServices.getApiHeaders(this.apiURL)}

        ).pipe(
            map<HTTPResponse, APIBlockResponse>(
                resp => ({
                    blocks: List.map(
                        block => ({
                            data: pipe(
                                block.Items,
                                List.sortBy(x => x.freq),
                                List.map((v,  i) => ({
                                    name: List.map(v => v.n, v.Word).join(' '),
                                    freq: v.freq,
                                    ipm: v.rel,
                                    norm: v.norm,
                                    order: i
                                }))
                            )
                        }),
                        resp.Blocks
                    ),
                    concId: resp.conc_persistence_op_id,
                    corpname: args.corpname
                })
            )
        );
    }
}