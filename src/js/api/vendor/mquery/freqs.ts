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
import { List, pipe } from 'cnc-tskit';

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
    }

    stateToArgs(state:MinSingleCritFreqState, concId:string, subcname?:string):MQueryFreqArgs {
        return {
            corpname: state.corpname,
            path: state.freqType === 'text-types' ? 'text-types' : 'freqs',
            queryArgs: {
                subcorpus: subcname ? subcname : state.subcname,
                q: `[lemma="${concId}"]`,
                flimit: state.flimit,
                matchCase: '0',
                attr: state.fcrit,
            }
        };
    }

    /**
     * Call the MQuery freqs API.
     *
     * Please note that the method groups items into a single one
     * in case args.path is 'freqs' as in such case we expect the freqs to represent
     * a single lemma. But once we take into account the recent CNC lemmatization,
     * where multivalues are involved - we need to group stuff together
     * (e.g. 'já', 'já|být' represent the same lemma).
     *
     * For args.path == 'text-types', multiple values represent whole different thing
     * (freqs for different domains) - so in that case, we don't group anything.
     */
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
                usesubcorp: args.queryArgs.subcorpus,
                concsize: resp.concSize,
                concId: '',
                data: args.path === 'text-types' ?
                    pipe(
                        resp.freqs,
                        List.map(
                            v => ({
                                name: v.word,
                                freq: v.freq,
                                ipm: v.ipm,
                                norm: v.base
                            }),
                        )
                    ) :
                    pipe(
                        resp.freqs,
                        List.sorted((x1, x2) => x2.freq - x1.freq),
                        List.reduce(
                            (acc, curr) => {
                                return {
                                    ...acc,
                                    name: [...acc.name, curr.word],
                                    freq: acc.freq + curr.freq,
                                    ipm: acc.ipm + curr.ipm,
                                    norm: curr.base,
                                }
                            },
                            {
                                name: [],
                                freq: 0,
                                ipm: 0,
                                norm: 0
                            }
                        ),
                        x => [{...x, name: List.empty(x.name) ? '' : List.head(x.name)}]
                    )
                })
            )
        );
    }
}