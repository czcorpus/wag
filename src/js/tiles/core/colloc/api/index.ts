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
import { Dict, HTTP, List, pipe, tuple } from 'cnc-tskit';
import urlJoin from 'url-join';

import { ajax$ } from '../../../../page/ajax.js';
import { CorpusDetails, ResourceApi } from '../../../../types.js';
import { CorpusInfoAPI } from '../../../../api/vendor/mquery/corpusInfo.js';
import { Backlink, BacklinkConf } from '../../../../page/tile.js';
import { IApiServices } from '../../../../appServices.js';
import { CollApiResponse } from '../common.js';
import { IDataStreaming } from '../../../../page/streaming.js';


export interface BasicHTTPResponse {
    concSize:number;
    corpusSize:number;
    subcSize?:number;
    colls:Array<{
        word:string;
        score:number;
        freq:number;
        interactionId:string;
    }>;
    cmpColls?:Array<{
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
    cmpCorp?:string;
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

    private readonly backlinkConf:BacklinkConf;

    private readonly useWithExamplesVariant:boolean;

    constructor(apiURL:string, useWithExamplesVariant:boolean, apiServices:IApiServices, backlinkConf:BacklinkConf) {
        this.apiURL = apiURL;
        this.apiServices = apiServices;
        this.srcInfoService = new CorpusInfoAPI(apiURL, apiServices);
        this.backlinkConf = backlinkConf;
        this.useWithExamplesVariant = useWithExamplesVariant;
    }

    getSourceDescription(streaming:IDataStreaming, tileId:number, lang:string, corpname:string):Observable<CorpusDetails> {
        return this.srcInfoService.call(streaming, tileId, 0, {corpname, lang});
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
            List.filter(
                ([k, v]) => v !== undefined
            ),
            List.map(
                ([k, v]) => `${k}=${encodeURIComponent(v)}`
            ),
            x => x.join('&')
        )
    }

    private prepareCollWithExArgs(queryArgs:MQueryCollArgs, event:string):string {
        return this.prepareArgs({
            ...queryArgs,
            examplesPerColl: 2,
            event
        });
    }

    private mkUrl(args:MQueryCollArgs, event:string):string {
        return this.useWithExamplesVariant ?
            urlJoin(
                this.apiURL,
                'collocations-extended',
                args.corpusId
            ) + `?${this.prepareCollWithExArgs(args, event)}` :
            urlJoin(
                this.apiURL,
                'collocations',
                args.corpusId
            ) + `?${this.prepareArgs(args)}`;
    }

    private mkRequest(streaming:IDataStreaming, tileId:number, queryIdx:number, args:MQueryCollArgs|null):Observable<BasicHTTPResponse> {
        if (streaming) {
            return streaming.registerTileRequest<BasicHTTPResponse>(
                {
                    tileId,
                    queryIdx,
                    method: HTTP.Method.GET,
                    url: args ? this.mkUrl(args, `DataTile-${tileId}.${queryIdx}`) : '',
                    body: {},
                    isEventSource: this.useWithExamplesVariant,
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
                            srchRange: tuple(0, 0),
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

    call(streaming:IDataStreaming, tileId:number, queryIdx:number, args:MQueryCollArgs|null):Observable<CollApiResponse> {
        return this.mkRequest(streaming, tileId, queryIdx, args).pipe(
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
                            interactionId: x.interactionId
                        }),
                        v.colls
                    ),
                    cmpData: v.cmpColls
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