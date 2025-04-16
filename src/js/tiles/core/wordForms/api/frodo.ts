/*
 * Copyright 2025 Martin Zimandl <martin.zimandl@gmail.com>
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
import { Observable, map } from 'rxjs';

import { CorpusDetails, ResourceApi } from '../../../../types.js';
import { IApiServices } from '../../../../appServices.js';
import { Backlink } from '../../../../page/tile.js';
import { ajax$ } from '../../../../page/ajax.js';
import { HTTP, Ident, List } from 'cnc-tskit';
import { CorpusInfoAPI } from '../../../../api/vendor/mquery/corpusInfo.js';
import { RequestArgs, Response } from '../common.js';
import urlJoin from 'url-join';


export interface FrodoResponse {
    matches:Array<{
        _id:string;
        lemma:string;
        forms:Array<{
            word:string;
            count:number;
            arf:number;
        }>;
        sublemmas:Array<{
            value:string;
            count:number;
        }>;
        pos:string;
        is_pname:boolean;
        count:number;
        ipm:number;
        ngramSize:number;
        simFreqScore:number;
    }>;
}


export class FrodoWordFormsAPI implements ResourceApi<RequestArgs, Response> {

    private readonly apiURL;

    private readonly apiServices:IApiServices;

    private readonly srcInfoService:CorpusInfoAPI;

    private readonly useDataStream:boolean;

    constructor(apiURL:string, useDataStream:boolean, apiServices:IApiServices) {
        this.apiURL = apiURL;
        this.useDataStream = useDataStream;
        this.apiServices = apiServices;
        this.srcInfoService = new CorpusInfoAPI(apiURL, apiServices);
    }

    call(tileId:number, multicastRequest:boolean, args:RequestArgs):Observable<Response> {
        const url = urlJoin(this.apiURL, '/dictionary/', args.corpName, 'search', args.lemma);
        return (this.useDataStream ?
            this.apiServices.dataStreaming().registerTileRequest<FrodoResponse>(
                multicastRequest,
                {
                    tileId,
                    method: HTTP.Method.GET,
                    url: url + `?pos=${encodeURIComponent(args.pos.join(" "))}`,
                    body: {},
                    contentType: 'application/json',
                }
            ) :
            ajax$<FrodoResponse>(
                HTTP.Method.GET,
                url,
                {
                    pos: args.pos.join(" "),
                },
                {
                    headers: this.apiServices.getApiHeaders(this.apiURL),
                }
            )
        ).pipe(
            map(resp => {
                return {
                    forms: List.map(
                        item => ({
                            value: item.word,
                            freq: item.count,
                            ratio: item.count / resp.matches[0].count,
                            interactionId: Ident.puid(),
                        }),
                        resp.matches[0].forms,
                    )
                }
            })
        );
    }

    getSourceDescription(tileId:number, multicastRequest:boolean, lang:string, corpname:string):Observable<CorpusDetails> {
        return this.srcInfoService.call(tileId, multicastRequest, {corpname, lang});
    }

    getBacklink(queryId:number, subqueryId?:number):Backlink|null {
        return null;
    }

    supportsMultiWordQueries():boolean {
        return false;
    }

}