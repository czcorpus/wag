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
import { IApiServices } from '../../../../appServices.js';
import { Backlink } from '../../../../page/tile.js';
import { ajax$ } from '../../../../page/ajax.js';
import { FreqRowResponse } from '../../../../api/vendor/mquery/common.js';
import { Ident, List } from 'cnc-tskit';
import { CorpusInfoAPI } from '../../../../api/vendor/mquery/corpusInfo.js';
import { Response } from '../common.js';


export interface LemmaItem {
    lemma:string;
    pos:string;
    forms:Array<FreqRowResponse>;
}

export interface RequestArgs {
    corpName:string;
    lemma:string;
    pos:Array<string>;
}



export class MQueryWordFormsAPI implements ResourceApi<RequestArgs, Response> {

    private readonly apiURL;

    private readonly apiServices:IApiServices;

    private readonly srcInfoService:CorpusInfoAPI;

    constructor(apiURL:string, apiServices:IApiServices) {
        this.apiURL = apiURL;
        this.apiServices = apiServices;
        this.srcInfoService = new CorpusInfoAPI(apiURL, apiServices);
    }

    call(tileId:number, multicastRequest:boolean, args:RequestArgs):Observable<Response> {
        const params = {
            lemma: args.lemma,
            pos: args.pos.join(" "),
        }
        return ajax$<Array<LemmaItem>>(
            'GET',
            `${this.apiURL}/word-forms/${args.corpName}`,
            params,
            {
                headers: this.apiServices.getApiHeaders(this.apiURL),
            }
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
        )
    }

    getSourceDescription(tileId:number, multicastRequest:boolean, lang:string, corpname:string):Observable<CorpusDetails> {
        return this.srcInfoService.call(tileId, multicastRequest, {corpname, lang});
    }

    createBacklink(args:RequestArgs, backlink:Backlink) {
        return null
    }

    supportsMultiWordQueries():boolean {
        return false;
    }

}