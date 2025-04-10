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
import { Backlink } from '../../../page/tile.js';
import { IApiServices } from '../../../appServices.js';
import { CollApiResponse } from './common.js';


export interface HTTPResponse {
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

const measureMap = {
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

    constructor(apiURL:string, useDataStream:boolean, apiServices:IApiServices) {
        this.apiURL = apiURL;
        this.apiServices = apiServices;
        this.srcInfoService = new CorpusInfoAPI(apiURL, apiServices);
        this.useDataStream = useDataStream;
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

    private mkRequest(tileId:number, multicastRequest:boolean, args:MQueryCollArgs):Observable<HTTPResponse> {
        if (this.useDataStream) {
            return this.apiServices.dataStreaming().registerTileRequest<HTTPResponse>(
                multicastRequest,
                {
                    tileId,
                    method: HTTP.Method.GET,
                    url: args ?
                        urlJoin(this.apiURL, 'collocations', args.corpusId) + `?${this.prepareArgs(args)}` :
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
                            resultType:'coll'
                        }
                )
            )

        } else {
            return ajax$<HTTPResponse>(
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
        return null;
    }
}