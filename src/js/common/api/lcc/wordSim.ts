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
import { cachedAjax$ } from '../../ajax';
import { HTTPHeaders, IAsyncKeyValueStore, SourceDetails } from '../../types';
import { WordSimApiResponse, WordSimApi } from '../abstract/wordSim';
import { map, concatMap } from 'rxjs/operators';
import { WordSimModelState } from '../../models/wordSim';


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

export class LccCoocSimApi implements WordSimApi<LccCoocSimApiArgs> {

    private readonly apiURL:string;

    private readonly customHeaders:HTTPHeaders;

    private readonly cache:IAsyncKeyValueStore;

    constructor(cache:IAsyncKeyValueStore, apiURL:string, customHeaders?:HTTPHeaders) {
        this.apiURL = apiURL;
        this.customHeaders = customHeaders || {};
        this.cache = cache;
    }

    stateToArgs(state:WordSimModelState, query:string):LccCoocSimApiArgs {
        return {
            corpus: state.corpus,
            word: query,
            limit: state.maxResultItems,
            minSim: state.minScore
        };
    }

    supportsTweaking():boolean {
        return false;
    }

    getSourceDescription(tileId:number, corpname:string):Observable<SourceDetails> {
        return rxOf({
            tileId: tileId,
            title: 'REST API of the Leipzig Corpora Collection / Projekt Deutscher Wortschatz',
            description: '',
            author: 'Deutscher Wortschatz',
            href: 'http://wortschatz.uni-leipzig.de/en'
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
                    {headers: this.customHeaders}
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

