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
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { HTTP, Ident } from 'cnc-tskit';

import { QueryMatch } from '../../../query/index.js';
import { IWordFormsApi, RequestConcArgs, Response } from '../../abstract/wordForms.js';
import { CorpusDetails, WebDelegateApi } from '../../../types.js';
import { BacklinkArgs, KontextFreqDistribAPI } from './freqs.js';
import { CorpusInfoAPI } from './corpusInfo.js';
import { IApiServices } from '../../../appServices.js';
import { Backlink, BacklinkWithArgs } from '../../../page/tile.js';


export interface HTTPResponse {
    result:Array<QueryMatch>;
}


export class WordFormsAPI implements IWordFormsApi, WebDelegateApi {

    private readonly fapi:KontextFreqDistribAPI;

    private readonly srcInfoService:CorpusInfoAPI;

    constructor(apiURL:string, apiServices:IApiServices) {
        this.fapi = new KontextFreqDistribAPI(apiURL, apiServices);
        this.srcInfoService = new CorpusInfoAPI(apiURL, apiServices);
    }

    call(args:RequestConcArgs):Observable<Response> {
        return this.fapi.call({
            corpname: args.corpName,
            usesubcorp: args.subcorpName,
            q: '~' + args.concPersistenceID,
            flimit: 1,
            freq_sort: 'freq',
            fpage: 1,
            ftt_include_empty: 0,
            fcrit: 'word/ie 0~0>0',
            freq_type: 'tokens',
            format:'json'

        }).pipe(
            map(
                (item) => {
                    const total = item.data.reduce((acc, curr) => curr.freq + acc, 0);
                    return {
                        forms: item.data.map(v => ({
                            value: v.name,
                            freq: v.freq,
                            ratio: v.freq / total,
                            interactionId: Ident.puid()
                        }))
                    };
                }
            )
        );
    }

    getSourceDescription(tileId:number, lang:string, corpname:string):Observable<CorpusDetails> {
        return this.srcInfoService.call({
            tileId: tileId,
            corpname: corpname,
            format: 'json'
        });
    }

    createBacklink(args:RequestConcArgs, backlink:Backlink):BacklinkWithArgs<BacklinkArgs> {
        return backlink ?
        {
            url: backlink.url,
            method: backlink.method || HTTP.Method.GET,
            label: backlink.label,
            args: {
                corpname: args.corpName,
                usesubcorp: args.subcorpName,
                q: `~${args.concPersistenceID}`,
                fcrit: ['word/ie 0~0>0'],
                freq_type: 'tokens',
                flimit: 1,
                freq_sort: 'freq',
                fpage: 1,
                ftt_include_empty: 0
            }
        } :
        null;
    }

    getBackLink(backlink:Backlink):Backlink {
        return this.fapi.getBackLink(backlink)
    }

    supportsMultiWordQueries():boolean {
        return true;
    }

}