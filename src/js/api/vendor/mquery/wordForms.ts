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

import { IWordFormsApi, RequestArgs, Response } from '../../abstract/wordForms';
import { IAsyncKeyValueStore, CorpusDetails } from '../../../types';
import { IApiServices } from '../../../appServices';
import { Backlink } from '../../../page/tile';
import { cachedAjax$ } from '../../../page/ajax';
import { FreqRowResponse } from './common';
import { Ident, List } from 'cnc-tskit';
import { CorpusInfoAPI } from './corpusInfo';


export interface LemmaItem {
    lemma:string;
    pos:string;
    forms:Array<FreqRowResponse>;
}


export class WordFormsAPI implements IWordFormsApi {

    private readonly cache:IAsyncKeyValueStore;

    private readonly apiURL;

    private readonly apiServices:IApiServices;

    private readonly srcInfoService:CorpusInfoAPI;

    constructor(cache:IAsyncKeyValueStore, apiURL:string, apiServices:IApiServices) {
        this.cache = cache;
        this.apiURL = apiURL;
        this.apiServices = apiServices;
        this.srcInfoService = new CorpusInfoAPI(cache, apiURL, apiServices);
    }

    call(args:RequestArgs):Observable<Response> {
        const params = {
            lemma: args.lemma,
            pos: args.pos.join(" "),
        }
        return cachedAjax$<Array<LemmaItem>>(this.cache)(
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

    getSourceDescription(tileId:number, lang:string, corpname:string):Observable<CorpusDetails> {
        return this.srcInfoService.call({tileId, corpname, lang});
    }

    createBacklink(args:RequestArgs, backlink:Backlink) {
        return null
    }

    supportsMultiWordQueries():boolean {
        return false;
    }

}