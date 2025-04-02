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

import { Observable, of as rxOf } from 'rxjs';
import { CorpusDetails, ResourceApi, WebDelegateApi } from '../../../types.js';
import { Dict, HTTP, List, pipe } from 'cnc-tskit'
import { ajax$ } from '../../../page/ajax.js';
import { IApiServices } from '../../../appServices.js';
import { Backlink } from '../../../page/tile.js';
import urlJoin from 'url-join';
import { LineElementType } from '../../../api/vendor/mquery/concordance/common.js';
import { CorpusInfoAPI } from '../../../api/vendor/mquery/corpusInfo.js';



export interface SpeechReqArgs {
    corpname:string;
    idx:number;
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
        ref:string; // TODO do we need this?
    };
    resultType:'tokenContext';
    error?:string;
}

/**
 *
 */
export class SpeechesApi implements ResourceApi<SpeechReqArgs, SpeechResponse>, WebDelegateApi {

    private readonly apiUrl:string;

    private readonly useDataStream:boolean;

    private readonly srcInfoService:CorpusInfoAPI;

    private readonly apiServices:IApiServices;

    constructor(apiUrl:string, useDataStream:boolean, apiServices:IApiServices) {
        this.apiUrl = apiUrl;
        this.srcInfoService = new CorpusInfoAPI(apiUrl, apiServices);
        this.apiServices = apiServices;
        this.useDataStream = useDataStream;
    }

    getSourceDescription(tileId:number, multicastRequest:boolean, lang:string, corpname:string):Observable<CorpusDetails> {
        return this.srcInfoService.call(tileId, multicastRequest, {
            corpname: corpname,
            lang: lang
        });
    }

    call(tileId:number, multicastRequest:boolean, args:SpeechReqArgs):Observable<SpeechResponse> {
        if (this.useDataStream) {
            args['idx'] = 3016784;
            const query = this.prepareArgs(args);
            return this.apiServices.dataStreaming().registerTileRequest<SpeechResponse>(
                multicastRequest,
                {
                    tileId,
                    method: HTTP.Method.GET,
                    url: urlJoin(this.apiUrl, 'token-context', args.corpname) + `?${query}`,
                    body: {},
                    contentType: 'application/json',
                }
            );

        } else {
            const headers = this.apiServices.getApiHeaders(this.apiUrl);
            headers['X-Is-Web-App'] = '1';
            return ajax$<SpeechResponse>(
                HTTP.Method.GET,
                urlJoin(this.apiUrl, 'token-context', args.corpname),
                args,
                {
                    headers,
                    withCredentials: true
                }
            );
        }
    }

    getBackLink(backlink:Backlink):Backlink {
        return {
            label: 'KonText',
            method: HTTP.Method.GET,
            ...(backlink || {}),
            url: (backlink?.url ? backlink.url : this.apiUrl) + '/view',
        }
    }

    private prepareArgs(queryArgs:SpeechReqArgs):string {
        return pipe(
            {
                ...queryArgs,
                corpname: undefined,
            },
            Dict.toEntries(),
            List.filter(([_, v]) => v !== null),
            List.map(
                ([k, v]) => `${k}=${encodeURIComponent(v)}`
            ),
            x => x.join('&')
        )
    }
}