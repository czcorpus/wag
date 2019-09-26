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

import { cachedAjax$ } from '../../../common/ajax';
import { HTTPHeaders, IAsyncKeyValueStore } from '../../../common/types';
import { puid } from '../../../common/util';
import { CollApiResponse, CollocationApi } from '../abstract/collocations';
import { CollocModelState } from '../../models/collocations/collocations';
import { LemmaVariant } from '../../query';


export interface CollRequestArgs {
    corpus:string;
    word:string;
    limit:number;
}

type HttpApiResponse = Array<{
    w1:{id:number; word:string; freq:number};
    w2:{id:number; word:string; freq:number};
    freq:number;
    sig:number;
}>;


// This API handles cooccurrence service as provided by
// the REST API of the Leipzig Corpora Collection.


export class LccCollAPI implements CollocationApi<CollRequestArgs> {

    private readonly apiURL:string;

    private readonly customHeaders:HTTPHeaders;

    private readonly cache:IAsyncKeyValueStore;

    constructor(cache:IAsyncKeyValueStore, apiURL:string, customHeaders?:HTTPHeaders) {
        this.apiURL = apiURL;
        this.customHeaders = customHeaders || {};
        this.cache = cache;
    }

    stateToArgs(state:CollocModelState, dataSpec:LemmaVariant):CollRequestArgs {
        return {
            corpus: state.corpname,
            word: dataSpec.lemma,
            limit: state.citemsperpage
        };
    }

    supportsLeftRightContext():boolean {
        return false;
    }

    call(queryArgs:CollRequestArgs):Observable<CollApiResponse> {
        return cachedAjax$<HttpApiResponse>(this.cache)(
            'GET',
            [this.apiURL, queryArgs.corpus, 'cooccurrences', queryArgs.word]
                .map(v => v.replace(/^\/.+\/$/, '')).join('/'),
            {
                limit: queryArgs.limit
            },
            {headers: this.customHeaders}

        ).pipe(
            map(
                data => ({
                    concId: null,
                    collHeadings: [],
                    data: data.map(item => ({
                        stats: [],
                        freq: item.freq,
                        pfilter: null,
                        nfilter: null,
                        str: item.w2.word,
                        interactionId: puid()
                    }))
                })
            )
        );
    }

}

