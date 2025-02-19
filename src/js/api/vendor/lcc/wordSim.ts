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
import { cachedAjax$ } from '../../../page/ajax.js';
import { IAsyncKeyValueStore, SourceDetails } from '../../../types.js';
import { WordSimApiResponse, IWordSimApi } from '../../abstract/wordSim.js';
import { map, concatMap } from 'rxjs/operators';
import { WordSimModelState } from '../../../models/tiles/wordSim.js';
import { QueryMatch } from '../../../query/index.js';
import { IApiServices } from '../../../appServices.js';


export interface LccCoocSimApiArgs {
    corpus:string;
    word:string;
    limit:number; // default 20
    minSim:number; // default is 0.25
}

type HTTPResponse = Array<{
    word:{
        id:number;
        word:string;
        freq:number;
    };
    sim:number;
    measure:string;
}>;

export class LccCoocSimApi implements IWordSimApi<LccCoocSimApiArgs> {

    private readonly apiURL:string;

    private readonly apiServices:IApiServices;

    private readonly cache:IAsyncKeyValueStore;

    constructor(cache:IAsyncKeyValueStore, apiURL:string, apiServices:IApiServices) {
        this.apiURL = apiURL;
        this.apiServices = apiServices;
        this.cache = cache;
    }

    stateToArgs(state:WordSimModelState, queryMatch:QueryMatch):LccCoocSimApiArgs {
        return {
            corpus: state.corpus,
            word: queryMatch.lemma,
            limit: state.maxResultItems,
            minSim: state.minScore
        };
    }

    supportsTweaking():boolean {
        return false;
    }

    supportsMultiWordQueries():boolean {
        return false;
    }

    getSourceDescription(tileId:number, lang:string, corpname:string):Observable<SourceDetails> {
        return rxOf({
            tileId: tileId,
            title: 'REST API of the Leipzig Corpora Collection / Projekt Deutscher Wortschatz',
            description: '',
            author: 'Deutscher Wortschatz',
            href: 'http://wortschatz.uni-leipzig.de/en',
            structure: {
                numTokens: 0 // TODO
            }
        });
    }

    call(queryArgs:LccCoocSimApiArgs):Observable<WordSimApiResponse> {
        return new Observable<string>(observer => {
            try {
                const url = this.apiURL + `/similarity/${queryArgs.corpus}/coocsim/${queryArgs.word}`;
                observer.next(url);
                observer.complete();

            } catch (err) {
                observer.error(err);
            }

        }).pipe(
            concatMap(
                url => cachedAjax$<HTTPResponse>(this.cache)(
                    'GET',
                    url,
                    {
                        limit: queryArgs.limit,
                        minSim: queryArgs.minSim
                    },
                    {
                        headers: this.apiServices.getApiHeaders(this.apiURL),
                        withCredentials: true
                    }
                )
            ),
            map(resp => ({
                words: resp.map(w => ({
                    word: w.word.word,
                    score: w.sim
                }))
            }))
        );
    }

}

