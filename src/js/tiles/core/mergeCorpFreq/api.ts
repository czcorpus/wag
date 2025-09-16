/**
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

import { filter, map } from 'rxjs';
import { ResourceApi, CorpusDetails } from '../../../types.js';
import { Observable } from 'rxjs';
import { Backlink, BacklinkConf } from '../../../page/tile.js';
import { IApiServices } from '../../../appServices.js';
import { CorpusInfoAPI } from '../../../api/vendor/mquery/corpusInfo.js';
import { MQueryFreqArgs, MQueryFreqDistribAPI } from '../../../api/vendor/mquery/freqs.js';
import { Dict, HTTP, List, pipe } from 'cnc-tskit';
import urlJoin from 'url-join';
import { ajax$ } from '../../../page/ajax.js';
import { IDataStreaming } from '../../../page/streaming.js';




export interface APIArgs {

}


export interface DataRow {
    word:string;
    freq:number;
    base:number;
    ipm:number;
}


export interface SingleFreqResult {
    concSize:number;
    corpusSize:number;
    fcrit:number;
    freqs:Array<DataRow>;
}

export interface HTTPResponse {
    parts:Array<SingleFreqResult>;
    error?:string;
};


function isEmptyObject(obj:any):boolean {
  return obj &&
         typeof obj === 'object' &&
         !Array.isArray(obj) &&
         Object.keys(obj).length === 0;
}


export class MergeFreqsApi implements ResourceApi<Array<MQueryFreqArgs>, Array<SingleFreqResult>> {

    private readonly apiURL:string;

    private readonly apiServices:IApiServices;

    private readonly backlinkConf:BacklinkConf;

    private srcInfoService:CorpusInfoAPI;

    private freqApi:MQueryFreqDistribAPI;

    constructor(apiURL:string, apiServices:IApiServices, backlinkConf:BacklinkConf) {
        this.apiURL = apiURL;
        this.apiServices = apiServices;
        this.backlinkConf = backlinkConf;
        this.srcInfoService = new CorpusInfoAPI(apiURL, apiServices);
        this.freqApi = new MQueryFreqDistribAPI(this.apiURL, this.apiServices, this.backlinkConf);
    }

    private prepareArgs(queryArgs:MQueryFreqArgs):string {
        return pipe(
            {
                subcorpus: queryArgs.queryArgs.subcorpus,
                q: queryArgs.queryArgs.q,
                flimit: queryArgs.queryArgs.flimit,
                attr: queryArgs.queryArgs.attr,
                textProperty: queryArgs.queryArgs.textProperty,
                matchCase: queryArgs.queryArgs.matchCase,
                maxItems: queryArgs.queryArgs.maxItems
            },
            Dict.filter((v, k) => v !== undefined && v !== null),
            Dict.toEntries(),
            List.map(
                ([k, v]) => `${k}=${encodeURIComponent(v)}`
            ),
            x => x.join('&')
        )
    }

    private isNoMatchArgs(args:Array<MQueryFreqArgs|null>):boolean {
        return List.some(x => !x, args);
    }

    private mkRequest(dataStreaming:IDataStreaming|null, tileId:number, queryIdx:number, args:Array<MQueryFreqArgs|null>):Observable<HTTPResponse> {
        if (dataStreaming) {
            return dataStreaming.registerTileRequest<HTTPResponse>(
                {
                    tileId,
                    method: HTTP.Method.POST,
                    url: this.isNoMatchArgs(args) ? '' : urlJoin(this.apiURL, '/merge-freqs'),
                    body: {
                        urls: this.isNoMatchArgs(args) ?
                            [] :
                            List.map(
                                arg => urlJoin(this.apiURL, arg.path, arg.corpname) + '?' + this.prepareArgs(arg),
                                args
                            )
                    },
                    contentType: 'application/json',
                    queryIdx,
                }
            ).pipe(
                filter(
                    v => !isEmptyObject(v)
                ),
                map(
                    resp => resp ?
                        resp :
                        {
                            parts: List.repeat(
                                x => ({
                                    concSize: 0,
                                    corpusSize: 0,
                                    fcrit: 0,
                                    freqs: []
                                }),
                                List.size(args)
                            )
                        }
                )
            )

        } else {
            return ajax$<HTTPResponse>(
                'POST',
                urlJoin(this.apiURL, '/merge-freqs'),
                List.map(
                    arg => urlJoin(this.apiURL, arg.path, arg.corpname) + '?' + this.prepareArgs(arg),
                    args
                ),
                {
                    headers: this.apiServices.getApiHeaders(this.apiURL),
                    withCredentials: true
                }
            )
        }
    }

    call(dataStreaming:IDataStreaming, tileId:number, queryIdx:number, args:Array<MQueryFreqArgs>):Observable<Array<SingleFreqResult>> {
        return this.mkRequest(dataStreaming, tileId, queryIdx, args).pipe(map(resp => resp.parts));
    }

    getSourceDescription(streaming:IDataStreaming, tileId:number, lang:string, corpname:string):Observable<CorpusDetails> {
        return this.srcInfoService.call(streaming, tileId, 0, {corpname, lang});
    }

    getBacklink(queryId:number, subqueryId?:number):Backlink|null {
        return this.freqApi.getBacklink(queryId, subqueryId);
    }

    requestBacklink(args:MQueryFreqArgs):Observable<URL> {
        return this.freqApi.requestBacklink(args);
    }
}
