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
import { catchError, concatMap, map } from 'rxjs/operators';
import { HTTP, List, pipe, tuple } from 'cnc-tskit';

import { ajax$, encodeURLParameters } from '../../../page/ajax.js';
import { CorpusDetails, ResourceApi } from '../../../types.js';
import { CorpusInfoAPI } from './corpusInfo.js';
import { Backlink, BacklinkConf } from '../../../page/tile.js';
import { IApiServices } from '../../../appServices.js';
import urlJoin from 'url-join';
import { IDataStreaming } from '../../../page/streaming.js';


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
    error?:string;
}

export interface DataRow {
    name:string;
    freq:number;
    ipm:number;
    norm:number;
    order?:number;
}


export interface APIResponse {
    queryIdx:number;
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

    private readonly backlinkConf:BacklinkConf;

    constructor(apiURL:string, apiServices:IApiServices, backlinkConf:BacklinkConf) {
        this.apiURL = apiURL;
        this.apiServices = apiServices;
        this.srcInfoService = new CorpusInfoAPI(apiURL, apiServices);
        this.backlinkConf = backlinkConf;
    }

    getSourceDescription(streaming:IDataStreaming, tileId:number, lang:string, corpname:string):Observable<CorpusDetails> {
        return this.srcInfoService.call(streaming, tileId, 0, {corpname, lang});
    }

    getBacklink(queryId:number, subqueryId?:number):Backlink|null {
        if (this.backlinkConf) {
            return {
                queryId,
                subqueryId,
                label: this.backlinkConf.label || 'KonText',
                async: true,
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
    call(streaming:IDataStreaming|null, tileId:number, queryIdx:number, args:MQueryFreqArgs|null):Observable<APIResponse> {
        return (
            streaming ?
                streaming.registerTileRequest<HTTPResponse>({
                    contentType: 'application/json',
                    body: {},
                    method: HTTP.Method.GET,
                    tileId,
                    queryIdx,
                    url: args ?
                        urlJoin(
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
                        ) :
                        '',
                }).pipe(
                    map(
                        resp => resp ?
                            resp :
                            ({
                                concSize: 0,
                                corpusSize: 0,
                                freqs: [],
                                fcrit: ''
                            })
                    )
                ) :
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
                corpname: args?.corpname,
                usesubcorp: args?.queryArgs.subcorpus,
                concsize: resp.concSize,
                concId: '',
                queryIdx,
                data: args?.path === 'text-types' ?
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

    requestBacklink(args:MQueryFreqArgs):Observable<URL> {
        const concArgs = {
            corpname: args.corpname,
            q: `q${args.queryArgs.q}`,
            format: 'json',
        };
        if (args.queryArgs.subcorpus) {
            concArgs['subcorpus'] = args.queryArgs.subcorpus;
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
            concatMap(resp => {
                const url = new URL(urlJoin(this.backlinkConf.url, 'freqs'));
                url.searchParams.set('corpname', args.corpname);
                if (args.queryArgs.subcorpus) {
                    url.searchParams.set('subcorpus', args.queryArgs.subcorpus);
                }
                url.searchParams.set('q', `~${resp.conc_persistence_op_id}`);
                url.searchParams.set('fcrit', args.queryArgs.attr);
                url.searchParams.set('freq_type', args.path === 'freqs' ? 'tokens' : 'text-types');
                url.searchParams.set('flimit', args.queryArgs.flimit.toString());
                url.searchParams.set('freq_sort', 'rel');
        
                // Validate the constructed URL
                return ajax$(
                    'GET',
                    url.toString(),
                    null,
                    {
                        headers: this.apiServices.getApiHeaders(this.apiURL),
                        withCredentials: true,
                    }
                ).pipe(
                    catchError(err => {
                        if (err.status === 401 || err.status === 403) {
                            throw new Error('global__kontext_login_required')
                        }
                        throw err;
                    }),
                    map(() => url)
                );
            }),
        );
    }
}