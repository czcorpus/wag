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
import { HTTP, List, pipe, tuple } from 'cnc-tskit';

import { ajax$, encodeURLParameters } from '../../../page/ajax.js';
import { CorpusDetails, ResourceApi } from '../../../types.js';
import { CorpusInfoAPI } from './corpusInfo.js';
import { Backlink, BacklinkConf } from '../../../page/tile.js';
import { MinSingleCritFreqState } from '../../../models/tiles/freq.js';
import { IApiServices } from '../../../appServices.js';
import urlJoin from 'url-join';
import { QueryMatch } from '../../../query/index.js';
import { mkLemmaMatchQuery } from './common.js';


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

export interface DataRow {
    name:string;
    freq:number;
    ipm:number;
    norm:number;
    order?:number;
}


export interface APIResponse {
    concId:string;
    corpname:string;
    concsize:number;
    usesubcorp:string|null;
    data:Array<DataRow>;
}


export interface MQueryFreqArgs {
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

export class MQueryFreqDistribAPI implements ResourceApi<MQueryFreqArgs, APIResponse> {

    private readonly apiURL:string;

    private readonly apiServices:IApiServices;

    private readonly srcInfoService:CorpusInfoAPI;

    private readonly useDataStream:boolean;

    private readonly backlinkConf:BacklinkConf;

    constructor(apiURL:string, apiServices:IApiServices, useDataStream:boolean, backlinkConf:BacklinkConf) {
        this.apiURL = apiURL;
        this.apiServices = apiServices;
        this.srcInfoService = new CorpusInfoAPI(apiURL, apiServices);
        this.useDataStream = useDataStream;
        this.backlinkConf = backlinkConf;
    }

    getSourceDescription(tileId:number, multicastRequest:boolean, lang:string, corpname:string):Observable<CorpusDetails> {
        return this.srcInfoService.call(tileId, multicastRequest, {corpname, lang});
    }

    getBacklink(queryId:number):Backlink|null {
        if (this.backlinkConf && this.backlinkConf.url) {
            return {
                queryId,
                label: this.backlinkConf.label || 'KonText',
            };
        }
        return null;
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
    call(tileId:number, multicastRequest:boolean, args:MQueryFreqArgs):Observable<APIResponse> {
        return (
            this.useDataStream ?
                this.apiServices.dataStreaming().registerTileRequest<HTTPResponse>(multicastRequest, {
                    contentType: 'application/json',
                    body: {},
                    method: HTTP.Method.GET,
                    tileId,
                    url: urlJoin(
                        this.apiURL,
                        args.path,
                        args.corpname
                    ) + '?' + encodeURLParameters(
                        List.filter(
                            item => !!item[1],
                            [
                                tuple('attr', args.queryArgs.attr),
                                tuple('flimit', args.queryArgs.flimit),
                                tuple('matchCase', args.queryArgs.matchCase),
                                tuple('maxItems', args.queryArgs.maxItems),
                                tuple('q', args.queryArgs.q),
                                tuple('subcorpus', args.queryArgs.subcorpus),
                                tuple('textProperty', args.queryArgs.textProperty),
                            ]
                        )
                    )
                }) :
                ajax$<HTTPResponse>(
                    'GET',
                    urlJoin(this.apiURL, args.path, args.corpname),
                    args.queryArgs,
                    {
                        headers: this.apiServices.getApiHeaders(this.apiURL),
                        withCredentials: true
                    }
                )
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
        )
    }

    requestBacklink(state:MinSingleCritFreqState, queryMatch:QueryMatch, posQueryGenerator:[string, string]):Observable<URL> {
        const concArgs = {
            corpname: state.corpname,
            q: `q${mkLemmaMatchQuery(queryMatch, posQueryGenerator)}`,
            format: 'json',
        };
        if (state.subcname) {
            concArgs['subcorpus'] = state.subcname;
        }
        return ajax$<{conc_persistence_op_id:string}>(
            'GET',
            urlJoin(this.backlinkConf.url, 'create_view'),
            concArgs,
            {
                headers: this.apiServices.getApiHeaders(this.apiURL),
                withCredentials: true,
            }
        ).pipe(
            map(resp => {
                const url = new URL(urlJoin(this.backlinkConf.url, 'freqs'));
                url.searchParams.set('corpname', state.corpname);
                if (state.subcname) {
                    url.searchParams.set('subcorpus', state.subcname);
                }
                url.searchParams.set('q', `~${resp.conc_persistence_op_id}`);
                url.searchParams.set('fcrit', state.fcrit);
                url.searchParams.set('freq_type', state.freqType);
                url.searchParams.set('flimit', state.flimit.toString());
                url.searchParams.set('freq_sort', state.freqSort);
                url.searchParams.set('fpage', state.fpage.toString());
                url.searchParams.set('ftt_include_empty', state.fttIncludeEmpty ? '1' : '0');
                return url;
            })
        );
    }
}