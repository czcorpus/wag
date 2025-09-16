/*
 * Copyright 2019 Tomas Machalek <tomas.machalek@gmail.com>
 * Copyright 2019 Institute of the Czech National Corpus,
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

import { CorpusDetails, ResourceApi } from '../../../types.js';
import { ajax$ } from '../../../page/ajax.js';
import { IApiServices } from '../../../appServices.js';
import { Backlink, BacklinkConf } from '../../../page/tile.js';
import { CorpusInfoAPI } from '../../../api/vendor/mquery/corpusInfo.js';
import { IDataStreaming } from '../../../page/streaming.js';



export interface SpeechReqArgs {
    corpname:string;
    subcorpus?:string;
    query:string;
    struct:Array<string>;
    leftCtx?:number;
    rightCtx?:number;
}

export interface SpeechToken {
    type:'token';
    word:string;
    strong:boolean;
    attrs:{[k:string]:string};
}

export interface MarkupToken {
    type:'markup';
    structureType:'open'|'close';
    attrs:{[k:string]:string};
    name:string;
}


export interface SpeechResponse {
    context:{
        text:Array<MarkupToken|SpeechToken>;
        ref:string;
    };
    resultType:'tokenContext';
    error?:string;
}

export interface SpeechData {
    text:Array<MarkupToken|SpeechToken>;
    kwicTokenIdx:number;
}

/**
 * SpeechesApi is a client for MQuery+APIGuard. MQuery provides both concordance to get
 * possible speeches and also concrete token ranges/details. To have both actions
 * (conc, token-context) as a single endpoint, APIGuard provides a wrapper API endpoint
 * for that.
 */
export class SpeechesApi implements ResourceApi<SpeechReqArgs, SpeechData> {

    private readonly apiUrl:string;

    private readonly srcInfoService:CorpusInfoAPI;

    private readonly apiServices:IApiServices;

    private readonly backlinkConf:BacklinkConf;

    constructor(apiUrl:string, apiServices:IApiServices, backlinkConf:BacklinkConf) {
        this.apiUrl = apiUrl;
        this.srcInfoService = new CorpusInfoAPI(apiUrl, apiServices);
        this.apiServices = apiServices;
        this.backlinkConf = backlinkConf;
    }

    getSourceDescription(dataStreaming:IDataStreaming, tileId:number, lang:string, corpname:string):Observable<CorpusDetails> {
        return this.srcInfoService.call(dataStreaming, tileId, 0, {
            corpname: corpname,
            lang: lang
        });
    }

    getBacklink(queryId:number, subqueryId?:number):Backlink|null {
        return this.backlinkConf ? {
            queryId,
            subqueryId,
            label: this.backlinkConf.label || 'KonText',
        } :
        null;
    }

    call(dataStreaming:IDataStreaming, tileId:number, queryIdx:number, args:SpeechReqArgs|null):Observable<SpeechData> {
        if (dataStreaming) {
            return dataStreaming.registerTileRequest<SpeechResponse>(
                {
                    tileId,
                    method: HTTP.Method.GET,
                    url: args ? urlJoin(this.apiUrl, 'speeches') + `?${this.prepareArgs(args)}` : '',
                    body: {},
                    contentType: 'application/json',
                }
            ).pipe(
                map(
                    resp => resp ?
                        {
                            text: resp.context.text,
                            kwicTokenIdx: parseInt(resp.context.ref.substring(1))
                        } :
                        {
                            text: [],
                            kwicTokenIdx: -1
                        }
                )
            );

        } else {
            const headers = this.apiServices.getApiHeaders(this.apiUrl);
            headers['X-Is-Web-App'] = '1';
            return ajax$<SpeechResponse>(
                HTTP.Method.GET,
                urlJoin(this.apiUrl, 'speeches'),
                args,
                {
                    headers,
                    withCredentials: true
                }

            ).pipe(
                map(
                    resp => ({
                        text: resp.context.text,
                        kwicTokenIdx: parseInt(resp.context.ref.substring(1))
                    })
                )
            )
        }
    }

    private prepareArgs(queryArgs:SpeechReqArgs):string {
        return pipe(
            {
                ...queryArgs,
                leftCtx: queryArgs.leftCtx || 0,
                rightCtx: queryArgs.rightCtx || 0,
                subcorpus: queryArgs.subcorpus || null,
            },
            Dict.toEntries(),
            List.filter(([_, v]) => v !== null),
            List.map(([k, v]) => {
                if (Array.isArray(v)) {
                    return v.map(item => `${k}=${encodeURIComponent(item)}`).join('&');
                }
                return `${k}=${encodeURIComponent(v)}`
            }),
            x => x.join('&')
        )
    }

    requestBacklink(args:SpeechReqArgs):URL {
        const url = new URL(urlJoin(this.backlinkConf.url, 'create_view'));
        url.searchParams.set('corpname', args.corpname);
        if (args.subcorpus) {
            url.searchParams.set('subcorpus', args.subcorpus);
        }
        url.searchParams.set('q', `q${args.query}`);
        return url;
    }
}