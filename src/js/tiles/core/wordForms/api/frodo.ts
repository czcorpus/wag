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
import { Backlink } from '../../../../page/tile.js';
import { ajax$ } from '../../../../page/ajax.js';
import { HTTP, Ident, List } from 'cnc-tskit';
import { RequestArgs, Response } from '../common.js';
import urlJoin from 'url-join';
import { WordFormsBacklinkAPI } from './backlink.js';
import { IDataStreaming } from '../../../../page/streaming.js';


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


export class FrodoWordFormsAPI extends WordFormsBacklinkAPI implements ResourceApi<RequestArgs, Response> {

    call(dataStreaming:IDataStreaming, tileId:number, queryIdx:number, args:RequestArgs):Observable<Response> {
        const url = urlJoin(this.apiURL, '/dictionary/', args.corpName, 'search', args.lemma);
        return (this.useDataStream ?
            dataStreaming.registerTileRequest<FrodoResponse>(
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

    getSourceDescription(dataStreaming:IDataStreaming, tileId:number, lang:string, corpname:string):Observable<CorpusDetails> {
        return this.srcInfoService.call(dataStreaming, tileId, 0, {corpname, lang});
    }

    getBacklink(queryId:number, subqueryId?:number):Backlink|null {
        if (this.backlinkConf) {
            return {
                queryId,
                subqueryId,
                label: this.backlinkConf.label || 'KonText',
            };
        }
        return null;
    }

    supportsMultiWordQueries():boolean {
        return false;
    }

}