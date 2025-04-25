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

import { ajax$ } from '../../../page/ajax.js';
import { DataApi, ResourceApi, SourceDetails } from '../../../types.js';
import { IApiServices } from '../../../appServices.js';
import { Dict, HTTP, Ident, List, pipe, tuple } from 'cnc-tskit';
import { FreqRowResponse } from '../../../api/vendor/mquery/common.js';
import { CorpusInfoAPI } from '../../../api/vendor/mquery/corpusInfo.js';
import { Backlink, BacklinkConf } from '../../../page/tile.js';
import urlJoin from 'url-join';



export interface SCollsDataRow {
    value:string;
    freq:number;
    base:number;
    ipm:number;
    collWeight:number;
    coOccScore:number;
}

export interface SCollsData {
    rows:Array<SCollsDataRow>;
    examplesQueryTpl:string;
}

export interface Token {
    word:string;
    strong:boolean;
    attrs:{[name:string]:string};
}

export interface ScollExampleLine {
    text:Array<Token>;
}

export interface SCollsExamples {
    lines:Array<ScollExampleLine>;
    word1:string;
    word2:string;
}

export function mkScollExampleLineHash(line:ScollExampleLine):string {
    return Ident.hashCode(
        pipe(
            line.text,
            List.map(x => x.word),
            x => x.join(' ')
        )
    );
}


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
        pos?:string;
    }
}


// query types are mquery endpoint values
export type SCollsQueryType = 'noun-modified-by'|'modifiers-of'|'verbs-subject'|'verbs-object';



export class ScollexSyntacticCollsAPI implements ResourceApi<SCollsRequest, [SCollsQueryType, SCollsData]> {

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


    getSourceDescription(tileId:number, multicastRequest:boolean, lang:string, corpname:string):Observable<SourceDetails> {
        return this.srcInfoService.call(tileId, multicastRequest, {corpname, lang});
    }

    getBacklink(queryId:number, subqueryId?:number):Backlink|null {
        return null;
    }

    call(tileId:number, multicastRequest:boolean, request:SCollsRequest):Observable<[SCollsQueryType, SCollsData]> {
        const url = urlJoin(this.apiURL, 'query', request.params.corpname, request.params.queryType);
        let data:Observable<SCollsApiResponse>;
        if (this.useDataStream) {
            data = this.apiServices.dataStreaming().registerTileRequest<SCollsApiResponse>(
                multicastRequest,
                {
                    tileId,
                    method: HTTP.Method.GET,
                    url: `${url}?${this.prepareArgs(request)}`,
                    body: {},
                    contentType: 'application/json',
                }
            );

        } else {
            data = ajax$<SCollsApiResponse>(
                HTTP.Method.GET,
                url,
                request.args,
                {
                    headers: this.apiServices.getApiHeaders(this.apiURL),
                    withCredentials: true
                }
            );
        }

        return data.pipe(
            map(data => (
                tuple(
                    request.params.queryType,
                    {
                        rows: List.map(
                            row => ({
                                value: row.word,
                                freq: row.freq,
                                base: row.base,
                                ipm: row.ipm,
                                collWeight: row.collWeight,
                                coOccScore: row.coOccScore
                            }),
                            data.freqs
                        ),
                        examplesQueryTpl: data.examplesQueryTpl
                    }
                )
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


export interface SCERequestArgs {
    params:{
        corpname:string;
    }
    args:{
        q:string;
    }
}

export class ScollexSyntacticCollsExamplesAPI implements DataApi<SCERequestArgs, SCollsExamples> {

    private readonly apiURL:string;

    private readonly useDataStream:boolean;

    private readonly apiServices:IApiServices;

    constructor(apiURL:string, useDataStream:boolean, apiServices:IApiServices) {
        this.apiURL = apiURL;
        this.apiServices = apiServices;
        this.useDataStream = useDataStream;
    }

    call(tileId:number, multicastRequest:boolean, request:SCERequestArgs):Observable<SCollsExamples> {
        const url = urlJoin(this.apiURL, 'conc-examples', request.params.corpname);
        if (this.useDataStream) {
            return this.apiServices.dataStreaming().registerTileRequest<SCollsExamples>(
                multicastRequest,
                {
                    tileId,
                    method: HTTP.Method.GET,
                    url: `${url}?${this.prepareArgs(request)}`,
                    body: {},
                    contentType: 'application/json',
                }
            );

        } else {
            return ajax$<SCollsExamples>(
                HTTP.Method.GET,
                url,
                request.args,
                {
                    headers: this.apiServices.getApiHeaders(this.apiURL),
                    withCredentials: true
                }
            );
        }
    }

    private prepareArgs(queryArgs:SCERequestArgs):string {
        return pipe(
            {
                ...queryArgs.args,
            },
            Dict.toEntries(),
            List.filter(([_, v]) => v !== null),
            List.map(([k, v]) => `${k}=${encodeURIComponent(v)}`),
            x => x.join('&'),
        )
    }
}
