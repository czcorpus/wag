/*
 * Copyright 2023 Martin Zimandl <martin.zimandl@gmail.com>
 * Copyright 2023 Institute of the Czech National Corpus,
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
import { Observable, map } from 'rxjs';
import urlJoin from 'url-join';

import { ajax$ } from '../../../../page/ajax.js';
import { ResourceApi, SourceDetails } from '../../../../types.js';
import { IApiServices } from '../../../../appServices.js';
import { Dict, HTTP, List, pipe } from 'cnc-tskit';
import { FreqRowResponse } from '../../../../api/vendor/mquery/common.js';
import { CorpusInfoAPI } from '../../../../api/vendor/mquery/corpusInfo.js';
import { IDataStreaming } from '../../../../page/streaming.js';
import { Backlink, BacklinkConf } from '../../../../page/tile.js';
import { SCollsData } from './common.js';



export interface SCollsApiResponse {
    concSize:number;
    corpusSize:number;
    freqs:Array<FreqRowResponse>;
    examplesQueryTpl:string;
}


export interface SCollsRequest {
    params:{
        corpname:string;
        queryType:SCollsQueryType;
    },
    args:{
        w:string;
        textType?:string;
        deprel?:string;
        pos?:string;
    }
}


// query types are mquery endpoint values
export type SCollsQueryType = 'nouns-modified-by'|'modifiers-of'|'verbs-subject'|'verbs-object'|'mixed'|'none';



export class ScollexSyntacticCollsAPI implements ResourceApi<SCollsRequest, SCollsData> {

    private readonly apiURL:string;

    private readonly apiServices:IApiServices;

    private readonly srcInfoService:CorpusInfoAPI;

    private readonly backlinkConf:BacklinkConf;

    constructor(apiURL:string, apiServices:IApiServices, backlinkConf:BacklinkConf) {
        this.apiURL = apiURL;
        this.apiServices = apiServices;
        this.backlinkConf = backlinkConf;
        this.srcInfoService = new CorpusInfoAPI(apiURL, apiServices);
    }


    getSourceDescription(streaming:IDataStreaming, tileId:number, lang:string, corpname:string):Observable<SourceDetails> {
        return this.srcInfoService.call(streaming, tileId, 0, {corpname, lang});
    }

    getBacklink(queryId:number, subqueryId?:number):Backlink|null {
        return null;
    }

    call(streaming:IDataStreaming, tileId:number, queryIdx:number, request:SCollsRequest):Observable<SCollsData> {
        const url = urlJoin(this.apiURL, 'query', request.params.corpname, request.params.queryType);
        let data:Observable<SCollsApiResponse>;
        return streaming.registerTileRequest<SCollsApiResponse>(
            {
                tileId,
                method: HTTP.Method.GET,
                url: `${url}?${this.prepareArgs(request)}`,
                body: {},
                contentType: 'application/json',
            }
        ).pipe(
            map(data => (
                {
                    rows: List.map(
                        row => ({
                            value: row.word,
                            freq: row.freq,
                            base: row.base,
                            ipm: row.ipm,
                            collWeight: row.collScore,
                        }),
                        data.freqs
                    ),
                    examplesQueryTpl: data.examplesQueryTpl
                }
            )),
        );
    }

    private prepareArgs(queryArgs:SCollsRequest):string {
        return pipe(
            {
                ...queryArgs.args,
                pos: queryArgs.args.pos || null,
            },
            Dict.toEntries(),
            List.filter(([_, v]) => v !== null),
            List.map(([k, v]) => `${k}=${encodeURIComponent(v)}`),
            x => x.join('&'),
        )
    }
}
