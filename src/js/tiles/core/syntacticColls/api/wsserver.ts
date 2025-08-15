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

import { CorpusInfoAPI } from '../../../../api/vendor/mquery/corpusInfo.js';
import { IApiServices } from '../../../../appServices.js';
import { DataApi, ResourceApi } from '../../../../types.js';
import { SCollsApiResponse, SCollsData, SCollsQueryType, SCollsRequest } from './scollex.js';
import { BacklinkConf } from '../../../../page/tile.js';
import { IDataStreaming } from '../../../../page/streaming.js';
import { map, Observable, tap } from 'rxjs';
import urlJoin from 'url-join';
import { Dict, HTTP, List, tuple, pipe } from 'cnc-tskit';
import { ajax$ } from '../../../../page/ajax.js';


interface wordInfo {
    value:string;
    pos:string;
}


interface WSServerResponseEntry {
    searchMatch:wordInfo;
    collocate:wordInfo;
    deprel:string;
    logDice:number;
    tscore:number;
    lmi:number;
    rrf:number;
    mutualDist:number;
}

type WSServerResponse = Array<WSServerResponseEntry>;


/**
 *
 */
export class WSServerSyntacticCollsAPI implements DataApi<SCollsRequest, [SCollsQueryType, SCollsData]> {

    private readonly apiURL:string;

    private readonly useDataStream:boolean;

    private readonly apiServices:IApiServices;

    private readonly srcInfoService:CorpusInfoAPI;

    private readonly backlinkConf:BacklinkConf;

    constructor(apiURL:string, useDataStream:boolean, apiServices:IApiServices, backlinkConf:BacklinkConf) {
        this.apiURL = apiURL;
        this.apiServices = apiServices;
        this.useDataStream = useDataStream;
        this.backlinkConf = backlinkConf;
        this.srcInfoService = new CorpusInfoAPI(apiURL, apiServices);
    }

    private mkUrl(request:SCollsRequest):string {
        if (request.params.queryType === 'mixed') {
            return request.args.deprel ?
                urlJoin(
                    this.apiURL,
                    'dataset',
                    request.params.corpname,
                    'collocations',
                    encodeURIComponent(request.args.w),
                    request.args.deprel
                ) :
                urlJoin(
                    this.apiURL,
                    'dataset',
                    request.params.corpname,
                    'collocations',
                    encodeURIComponent(request.args.w)
                );

        } else {
            return request.args.deprel ?
                urlJoin(
                    this.apiURL,
                    'dataset',
                    request.params.corpname,
                    'collocationsOfType',
                    request.params.queryType,
                    encodeURIComponent(request.args.w),
                    request.args.deprel
                ) :
                urlJoin(
                    this.apiURL,
                    'dataset',
                    request.params.corpname,
                    'collocationsOfType',
                    request.params.queryType,
                    encodeURIComponent(request.args.w)
                );
        }
    }


    call(
        dataStreaming:IDataStreaming|null,
        tileId:number,
        queryIdx:number,
        request:SCollsRequest
    ):Observable<[SCollsQueryType, SCollsData]> {
        const url = this.mkUrl(request);
        return (
            dataStreaming ?
                dataStreaming.registerTileRequest<WSServerResponse>(
                    {
                        tileId,
                        method: HTTP.Method.GET,
                        url: `${url}?limit=20`,
                        body: {},
                        contentType: 'application/json',
                    }
                ) :
                ajax$<WSServerResponse>(
                    HTTP.Method.GET,
                    url,
                    request.args,
                    {
                        headers: this.apiServices.getApiHeaders(this.apiURL),
                        withCredentials: true
                    }
                )

        ).pipe(
            map(data => (
                tuple(
                    'mixed',
                    {
                        rows: List.map(
                            row => ({
                                value: row.collocate.value,
                                deprel: row.deprel,
                                freq: -1,
                                base: -1,
                                ipm: -1,
                                collWeight: row.rrf,
                                tscore: row.tscore,
                                logDice: row.logDice,
                                lmi: row.lmi,
                                rrf: row.rrf,
                                mutualDist: row.mutualDist
                            }),
                            data
                        ),
                        examplesQueryTpl: undefined
                    }
                )
            )),
        );
    }

}