/*
 * Copyright 2025 Martin Zimandl <martin.zimandl@gmail.com>
 * Copyright 2025 Institute of the Czech National Corpus,
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

import { cachedAjax$ } from '../../../page/ajax.js';
import { IAsyncKeyValueStore, CorpusDetails } from '../../../types.js';
import { CorpusInfoAPI } from './corpusInfo.js';
import { BacklinkWithArgs, Backlink } from '../../../page/tile.js';
import { APIResponse, IFreqDistribAPI } from '../../abstract/freqs.js';
import { MinSingleCritFreqState } from '../../../models/tiles/freq.js';
import { IApiServices } from '../../../appServices.js';


export interface HTTPResponse {
    concSize:number;
    corpusSize:number;
    subcSize?:number;
    freqs:Array<{
        word:string;
        freq:number;
        base:number;
        ipm:number;
    }>;
    fcrit:string;
    examplesQueryTpl?:string;
    error?:string
}

interface MQueryFreqArgs {
    corpname:string;
    path:'freqs'|'text-types';
    queryArgs:{
        subcorpus?:string;
        q:string;
        flimit:number;
        attr?:string;
        textProperty?:string;
        matchCase:string;
        maxItems?:number;
    }
}

export class MQueryFreqDistribAPI implements IFreqDistribAPI<MQueryFreqArgs> {

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
        return this.srcInfoService.call({tileId, corpname, lang});
    }

    createBacklink(state:MinSingleCritFreqState, backlink:Backlink, concId:string):BacklinkWithArgs<{}> {
        return null;
    };

    stateToArgs(state:MinSingleCritFreqState, concId:string, subcname?:string):MQueryFreqArgs {
        return {
            corpname: state.corpname,
            path: state.freqType === 'text-types' ? 'text-types' : 'freqs',
            queryArgs: {
                subcorpus: subcname,
                q: `[lemma="${concId}"]`,
                flimit: state.flimit,
                matchCase: '0',
                attr: state.fcrit,
            }
        };
    }

    call(args:MQueryFreqArgs):Observable<APIResponse> {
        return cachedAjax$<HTTPResponse>(this.cache)(
            'GET',
            this.apiURL + `/${args.path}/${args.corpname}`,
            args.queryArgs,
            {
                headers: this.apiServices.getApiHeaders(this.apiURL),
                withCredentials: true
            }

        ).pipe(
            map<HTTPResponse, APIResponse>(resp => ({
                corpname: args.corpname,
                usesubcorp: null,
                concsize: resp.concSize,
                concId: '',
                data: resp.freqs.map(v => ({
                        name: v.word,
                        freq: v.freq,
                        ipm: v.ipm,
                        norm: v.base
                })),
            }))
        );
    }
}