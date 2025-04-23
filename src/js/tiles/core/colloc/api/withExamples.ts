/*
 * Copyright 2025 Tomas Machalek <tomas.machalek@gmail.com>
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

import { map, Observable } from 'rxjs';
import { Dict, HTTP, List, pipe } from 'cnc-tskit';
import urlJoin from 'url-join';

import { IApiServices } from '../../../../appServices.js';
import { CorpusDetails, ResourceApi } from '../../../../types.js';
import { CollApiResponse, DataHeading, DataRow } from '../common.js';
import { BasicHTTPResponse, measureMap, MQueryCollArgs } from './basic.js';
import { CorpusInfoAPI } from '../../../../api/vendor/mquery/corpusInfo.js';
import { Backlink, BacklinkConf } from '../../../../page/tile.js';
import { ajax$ } from '../../../../page/ajax.js';
import { Line } from '../../../../api/vendor/mquery/concordance/common.js';


interface collItem {
    word:string;
    freq:number;
    score:number;
    examples:{
        text:Array<Line>;
        ref:string;
    }
}


export interface httpApiResponse {
    concSize:number;
    corpusSize:number;
    subcSize?:number;
    colls:Array<collItem>;
    measure:string;
    srchRange:[number, number];
    error?:string;
    resultType:'collWithExamples';
}


export class MQueryCollWithExamplesAPI implements ResourceApi<MQueryCollArgs, CollApiResponse> {

    private readonly apiURL:string;

    private readonly apiServices:IApiServices;

    private readonly srcInfoService:CorpusInfoAPI;

    private readonly useDataStream:boolean;

    private readonly backlinkConf:BacklinkConf;

    constructor(apiURL:string, useDataStream:boolean, apiServices:IApiServices, backlinkConf:BacklinkConf) {
        this.apiURL = apiURL;
        this.apiServices = apiServices;
        this.srcInfoService = new CorpusInfoAPI(apiURL, apiServices);
        this.useDataStream = useDataStream;
        this.backlinkConf = backlinkConf;
    }

    getSourceDescription(tileId:number, multicastRequest:boolean, lang:string, corpname:string):Observable<CorpusDetails> {
        return this.srcInfoService.call(tileId, multicastRequest, {corpname, lang});
    }

    supportsLeftRightContext():boolean {
        return true;
    }

    supportsMultiWordQueries():boolean {
        return false;
    }

    private prepareArgs(queryArgs:MQueryCollArgs):string {
        return pipe(
            {
                ...queryArgs
            },
            Dict.toEntries(),
            List.map(
                ([k, v]) => `${k}=${encodeURIComponent(v)}`
            ),
            x => x.join('&')
        )
    }

    private mkRequest(
        tileId:number,
        multicastRequest:boolean,
        args:MQueryCollArgs
    ):Observable<httpApiResponse> {
        if (this.useDataStream) {
            return this.apiServices.dataStreaming().registerTileRequest<httpApiResponse>(
                multicastRequest,
                {
                    tileId,
                    method: HTTP.Method.GET,
                    url: args ?
                        urlJoin(this.apiURL, 'collocations-with-examples', args.corpusId) + `?${this.prepareArgs(args)}` :
                        '',
                    body: {},
                    contentType: 'application/json',
                }
            ).pipe(
                map(
                    resp => resp ?
                        resp :
                        {
                            concSize: 0,
                            corpusSize: 0,
                            colls: [],
                            measure: null,
                            srchRange:[0, 0],
                            resultType:'collWithExamples'
                        }
                )
            )

        } else {
            return ajax$<httpApiResponse>(
                'GET',
                urlJoin(this.apiURL, '/collocations-with-examples/', args.corpusId),
                args,
                {
                    headers: this.apiServices.getApiHeaders(this.apiURL),
                    withCredentials: true
                }
            )
        }
    }

    call(tileId:number, multicastRequest:boolean, args:MQueryCollArgs):Observable<CollApiResponse> {
        return this.mkRequest(tileId, multicastRequest, args).pipe(
            map(
                v => ({
                    collHeadings: [
                        {
                            label: '-', // will be replaced by the tile
                            ident: pipe(
                                measureMap,
                                Dict.find((v2, k) => v.measure === v2),
                                srch => srch ? srch[0] : '-'
                            )
                        }
                    ],
                    data: List.map(
                        x => ({
                            str: x.word,
                            stats: [x.score],
                            freq: x.freq,
                            nfilter: [null, null],
                            pfilter: [null, null],
                            interactionId: null // TODO
                        }),
                        v.colls
                    )
                })
            )
        );
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

    requestBacklink(args:MQueryCollArgs):Observable<URL> {
        const concArgs = {
            corpname: args.corpusId,
            q: `q${args.q}`,
            format: 'json',
        };
        if (args.subcorpus) {
            concArgs['subcorpus'] = args.subcorpus;
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
                const url = new URL(urlJoin(this.backlinkConf.url, 'collx'));
                url.searchParams.set('corpname', args.corpusId);
                if (args.subcorpus) {
                    url.searchParams.set('subcorpus', args.subcorpus);
                }
                url.searchParams.set('q', `~${resp.conc_persistence_op_id}`);
                url.searchParams.set('cfromw', `-${args.srchLeft.toString()}`);
                url.searchParams.set('ctow', args.srchRight.toString());
                url.searchParams.set('cminfreq', args.minCollFreq.toString());
                return url;
            })
        );
    }
}