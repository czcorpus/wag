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
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Dict, HTTP, List, pipe } from 'cnc-tskit';
import urlJoin from 'url-join';

import { ajax$ } from '../../../page/ajax.js';
import { CorpusDetails, ResourceApi } from '../../../types.js';
import { CorpusInfoAPI } from '../../../api/vendor/mquery/corpusInfo.js';
import { Backlink, BacklinkConf } from '../../../page/tile.js';
import { IApiServices } from '../../../appServices.js';
import { CollApiResponse } from './common.js';


export interface BasicHTTPResponse {
    concSize:number;
    corpusSize:number;
    subcSize?:number;
    colls:Array<{
        word:string;
        score:number;
        freq:number;
    }>;
    measure:string;
    srchRange:[number, number];
    error?:string;
    resultType:'coll';
}

export interface MQueryCollArgs {
    corpusId:string;
    q:string;
    subcorpus:string;
    measure:
        'absFreq'|
        'logLikelihood'|
        'logDice'|
        'minSensitivity'|
        'mutualInfo'|
        'mutualInfo3'|
        'mutualInfoLogF'|
        'relFreq'|
        'tScore';
    srchLeft:number;
    srchRight:number;
    srchAttr:string;
    minCollFreq:number;
    maxItems:number;
}

export const measureMap = {
    'm': 'mutualInfo',
    '3': 'mutualInfo3',
    'l': 'logLikelihood',
    's': 'minSensitivity',
    'd': 'logDice',
    'p': 'mutualInfoLogF',
    'f': 'relFreq'
};

export class MQueryCollAPI implements ResourceApi<MQueryCollArgs, CollApiResponse> {

    private readonly apiURL:string;

    private readonly apiServices:IApiServices;

    private readonly srcInfoService:CorpusInfoAPI;

    private readonly useDataStream:boolean;

    private readonly backlinkConf:BacklinkConf;

    private readonly useWithExamplesVariant:boolean;

    constructor(apiURL:string, useWithExamplesVariant:boolean, useDataStream:boolean, apiServices:IApiServices, backlinkConf:BacklinkConf) {
        this.apiURL = apiURL;
        this.apiServices = apiServices;
        this.srcInfoService = new CorpusInfoAPI(apiURL, apiServices);
        this.useDataStream = useDataStream;
        this.backlinkConf = backlinkConf;
        this.useWithExamplesVariant = useWithExamplesVariant;
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

    private prepareArgs(queryArgs:{[k:string]:any}):string {
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

    private prepareCollWithExArgs(queryArgs:MQueryCollArgs):string {
        return this.prepareArgs({
            ...queryArgs,
            examplesPerColl: 2
        });
    }

    private mkUrl(args:MQueryCollArgs):string {
        return this.useWithExamplesVariant ?
            urlJoin(
                this.apiURL,
                'collocations-with-examples',
                args.corpusId
            ) + `?${this.prepareCollWithExArgs(args)}` :
            urlJoin(
                this.apiURL,
                'collocations',
                args.corpusId
            ) + `?${this.prepareArgs(args)}`;
    }

    private mkRequest(tileId:number, multicastRequest:boolean, args:MQueryCollArgs):Observable<BasicHTTPResponse> {
        if (this.useDataStream) {
            return this.apiServices.dataStreaming().registerTileRequest<BasicHTTPResponse>(
                multicastRequest,
                {
                    tileId,
                    method: HTTP.Method.GET,
                    url: args ? this.mkUrl(args) : '',
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
                            resultType:'coll'
                        }
                )
            )

        } else {
            return ajax$<BasicHTTPResponse>(
                'GET',
                urlJoin(this.apiURL, '/collocations/', args.corpusId),
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
                    concId: undefined,
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