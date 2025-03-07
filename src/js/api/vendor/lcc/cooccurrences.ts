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
import { map } from 'rxjs/operators';
import { Ident } from 'cnc-tskit';

import { ajax$ } from '../../../page/ajax.js';
import { SourceDetails } from '../../../types.js';
import { CollApiResponse, CollocationApi } from '../../abstract/collocations.js';
import { CollocModelState } from '../../../models/tiles/collocations.js';
import { QueryMatch } from '../../../query/index.js';
import { IApiServices } from '../../../appServices.js';


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

    private readonly apiServices:IApiServices;

    constructor(apiURL:string, apiServices:IApiServices) {
        this.apiURL = apiURL;
        this.apiServices = apiServices;
    }

    stateToArgs(state:CollocModelState, dataSpec:QueryMatch):CollRequestArgs {
        return {
            corpus: state.corpname,
            word: dataSpec.lemma,
            limit: state.citemsperpage
        };
    }

    supportsLeftRightContext():boolean {
        return false;
    }

    supportsMultiWordQueries():boolean {
        return false;
    }

    getSourceDescription(tileId:number, lang:string, corpname:string):Observable<SourceDetails> {
        return rxOf({
            tileId: tileId,
            title: 'Leipzig Corpora Collection',
            description: '',
            author: 'Leipzig University',
            href: 'http://wortschatz.uni-leipzig.de/en',
            structure: {
                numTokens: 0 // TODO
            }
        });
    }

    call(tileId:number, queryArgs:CollRequestArgs):Observable<CollApiResponse> {
        return ajax$<HttpApiResponse>(
            'GET',
            this.apiURL + `/coocurrences/${queryArgs.corpus}/cooccurrences/${queryArgs.word}/`,
            {
                limit: queryArgs.limit
            },
            {
                headers: this.apiServices.getApiHeaders(this.apiURL),
                withCredentials: true
            }

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
                        interactionId: Ident.puid()
                    }))
                })
            )
        );
    }

}

