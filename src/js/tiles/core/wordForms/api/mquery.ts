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

import { CorpusDetails, ResourceApi } from '../../../../types.js';
import { ajax$ } from '../../../../page/ajax.js';
import { FreqRowResponse } from '../../../../api/vendor/mquery/common.js';
import { Dict, HTTP, Ident, List, pipe } from 'cnc-tskit';
import { RequestArgs, Response } from '../common.js';
import urlJoin from 'url-join';
import { WordFormsBacklinkAPI } from './backlink.js';
import { IDataStreaming } from '../../../../page/streaming.js';


export interface LemmaItem {
    lemma:string;
    pos:string;
    forms:Array<FreqRowResponse>;
}


export class MQueryWordFormsAPI extends WordFormsBacklinkAPI implements ResourceApi<RequestArgs, Response> {

    private prepareArgs(queryArgs:RequestArgs):string {
        return pipe(
            {
                lemma: queryArgs.lemma,
                pos: queryArgs.pos.join(" "),
            },
            Dict.toEntries(),
            List.map(([k, v]) => `${k}=${encodeURIComponent(v)}`),
            x => x.join('&')
        )
    }

    call(dataStreaming:IDataStreaming, tileId:number, queryIdx:number, args:RequestArgs):Observable<Response> {
        const url = urlJoin(this.apiURL, '/word-forms/', args.corpName);
        return (this.useDataStream ?
            dataStreaming.registerTileRequest<Array<LemmaItem>>(
                {
                    tileId,
                    method: HTTP.Method.GET,
                    url: url + `?${this.prepareArgs(args)}`,
                    body: {},
                    contentType: 'application/json',
                }
            ) :
            ajax$<Array<LemmaItem>>(
                HTTP.Method.GET,
                url,
                {
                    lemma: args.lemma,
                    pos: args.pos.join(" "),
                },
                {
                    headers: this.apiServices.getApiHeaders(this.apiURL),
                }
            )
        ).pipe(
            map(resp => {
                const total = resp[0].forms.reduce((acc, curr) => curr.freq + acc, 0);
                return {
                    forms: List.map(
                        item => ({
                            value: item.word,
                            freq: item.freq,
                            ratio: item.freq / total,
                            interactionId: Ident.puid(),
                        }),
                        resp[0].forms,
                    )
                }
            })
        );
    }

    getSourceDescription(dataStreaming:IDataStreaming, tileId:number, lang:string, corpname:string):Observable<CorpusDetails> {
        return this.srcInfoService.call(dataStreaming, tileId, 0, {corpname, lang});
    }

    supportsMultiWordQueries():boolean {
        return false;
    }

}