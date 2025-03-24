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
import { HTTP } from 'cnc-tskit'
import { ajax$ } from '../../../page/ajax.js';
import { CorpusInfoAPI } from './corpusInfo.js';
import { LineElementType } from '../../abstract/concordance.js';
import { IApiServices } from '../../../appServices.js';
import { Backlink } from '../../../page/tile.js';



export interface SpeechReqArgs {
    corpname:string;
    attrs:'word';
    attr_allpos:'all';
    ctxattrs:'word';
    pos:number;
    structs:string;
    hitlen?:number;
    detail_left_ctx?:number;
    detail_right_ctx?:number;
    format:'json';
}

export interface SpeechResponse {
    pos:number;
    content:Array<{
        'class':LineElementType;
        str:string;
        mouseover?:Array<string>;
    }>;
    expand_right_args:{detail_left_ctx:number; detail_right_ctx:number; pos:number}|null;
    expand_left_args:{detail_left_ctx:number; detail_right_ctx:number; pos:number}|null;
    widectx_globals:Array<[string, string]>;
    messages:Array<[string, string]>;
}

/**
 *
 */
export class SpeechesApi implements ResourceApi<SpeechReqArgs, SpeechResponse>, WebDelegateApi {

    private readonly apiUrl:string;

    private readonly srcInfoService:CorpusInfoAPI;

    private readonly apiServices:IApiServices;

    constructor(apiUrl:string, apiServices:IApiServices) {
        this.apiUrl = apiUrl;
        this.srcInfoService = new CorpusInfoAPI(apiUrl, apiServices);
        this.apiServices = apiServices;
    }

    getSourceDescription(tileId:number, multicastRequest:boolean, lang:string, corpname:string):Observable<CorpusDetails> {
        return this.srcInfoService.call(tileId, multicastRequest, {
            corpname: corpname,
            format: 'json'
        });
    }

    call(tileId:number, multicastRequest:boolean, args:SpeechReqArgs):Observable<SpeechResponse> {
        const headers = this.apiServices.getApiHeaders(this.apiUrl);
        headers['X-Is-Web-App'] = '1';
        if (args.pos !== undefined) {
            return ajax$<SpeechResponse>(
                HTTP.Method.GET,
                this.apiUrl + '/widectx',
                args,
                {
                    headers,
                    withCredentials: true
                }
            );

        } else {
            return rxOf({
                pos: args.pos,
                content: [],
                expand_right_args: null,
                expand_left_args: null,
                widectx_globals: [],
                messages: []
            });
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
}