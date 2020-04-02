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
import { Ident } from 'cnc-tskit';

import { QueryMatch } from '../../query';
import { WordFormsApi, RequestConcArgs, Response } from '../abstract/wordForms';
import { HTTPHeaders, IAsyncKeyValueStore } from '../../types';
import { KontextFreqDistribAPI } from './freqs';


export interface HTTPResponse {
    result:Array<QueryMatch>;
}


export class WordFormsAPI implements WordFormsApi {

    fapi:KontextFreqDistribAPI;

    constructor(cache:IAsyncKeyValueStore, apiURL:string, customHeaders?:HTTPHeaders) {
        this.fapi = new KontextFreqDistribAPI(cache, apiURL, customHeaders);
    }

    /*
    ctxattrs: word,lemma,tag,afun
attr_vmode: mixed
pagesize: 25
refs: #,=doc.title
q: ~YIHxYd9Ey5cl
viewmode: kwic
attrs: word,lemma,tag,afun
corpname: syn2015
structs: doc,s
attr_allpos: all
fcrit: word/ie 0~0>0
ml: 0
*/

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

}