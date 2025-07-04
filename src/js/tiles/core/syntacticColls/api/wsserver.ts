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
import { map, Observable } from 'rxjs';
import urlJoin from 'url-join';
import { Dict, HTTP, List, tuple, pipe } from 'cnc-tskit';
import { ajax$ } from '../../../../page/ajax.js';


interface wordInfo {
    value:string;
    syntacticFunc:string;
}


interface WSServerResponseEntry {
    searchMatch:wordInfo;
    collocate:wordInfo;
    logDice:number;
    tscore:number;
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


    call(
        dataStreaming:IDataStreaming|null,
        tileId:number,
        queryIdx:number,
        request:SCollsRequest
    ):Observable<[SCollsQueryType, SCollsData]> {

        const url = urlJoin(
            this.apiURL,
            'dataset',
            request.params.corpname,
            'collocations',
            encodeURIComponent(request.args.w)
        );

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
                                searchMatchSyntFn: row.searchMatch.syntacticFunc,
                                value: row.collocate.value,
                                valueSyntFn: row.collocate.syntacticFunc,
                                freq: -1,
                                base: -1,
                                ipm: -1,
                                collWeight: row.tscore,
                                coOccScore: -1,
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