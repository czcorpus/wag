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

import { CorpusInfoAPI } from '../../../api/vendor/mquery/corpusInfo.js';
import { IApiServices } from '../../../appServices.js';
import { DataApi } from '../../../types.js';
import { BacklinkConf } from '../../../page/tile.js';
import { IDataStreaming } from '../../../page/streaming.js';
import { filter, map, Observable } from 'rxjs';
import urlJoin from 'url-join';
import { Dict, HTTP, List, pipe } from 'cnc-tskit';
import { ajax$ } from '../../../page/ajax.js';
import { SCollsDataRow, SCollsQueryType, SCollsRequest } from '../syntacticColls/api/scollex.js';


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
    ll:number;
    rrf:number;
    mutualDist:number;
}

interface WSServerResponse {
    parts:{
        [tt:string]:{items:Array<WSServerResponseEntry>; error:string}
    }
}


export interface SCollsTTRequest {
    params:{
        corpname:string;
        queryType:SCollsQueryType;
    },
    args:{
        w:string;
        pos?:string;
        textTypes:Array<string>;
    }
}


export interface SCollsPartsData {
    parts:{
        [tt:string]:{
            rows:Array<SCollsDataRow>;
            examplesQueryTpl:string;
        }
    }
}


/**
 *
 */
export class WSServerSyntacticCollsTTAPI implements DataApi<SCollsRequest, SCollsPartsData> {

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
        request:SCollsTTRequest|null
    ):Observable<SCollsPartsData> {
        const url = request ? urlJoin(this.apiURL, 'collocations-tt') : null;

        return (
            dataStreaming ?
                dataStreaming.registerTileRequest<WSServerResponse>(
                    {
                        tileId,
                        method: HTTP.Method.POST,
                        url,
                        body: {
                            tileId,
                            textTypes: request.args.textTypes,
                            dataset: request.params.corpname,
                            word: request.args.w,
                            pos: request.args.pos,
                            limit: 20
                        },
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
            filter(
                v => !!v
            ),
            map(data => (
                data ?
                    {
                        parts: pipe(
                            data.parts,
                            Dict.map(
                                (row, tt) => ({
                                    rows: List.map(
                                        item => ({
                                            value: item.collocate.value,
                                            deprel: item.deprel,
                                            freq: -1,
                                            base: -1,
                                            ipm: -1,
                                            collWeight: item.rrf,
                                            tscore: item.tscore,
                                            logDice: item.logDice,
                                            lmi: item.lmi,
                                            rrf: item.rrf,
                                            ll: item.ll,
                                            mutualDist: item.mutualDist
                                        }),
                                        row.items
                                    ),
                                    examplesQueryTpl: undefined
                                })
                            )
                        )
                    } :
                    {
                        parts: {}
                    }
            )),
        );
    }

}