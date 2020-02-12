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
import { Ident } from 'cnc-tskit';

import { cachedAjax$ } from '../../ajax';
import { HTTPHeaders, IAsyncKeyValueStore, SourceDetails } from '../../types';
import { WordSimApiResponse, WordSimApi } from '../abstract/wordSim';
import { map } from 'rxjs/operators';
import { WordSimModelState } from '../../models/wordSim';
import { CorpusInfoAPI } from '../kontext/corpusInfo';


export interface CNCWord2VecSimApiArgs {
    corpus:string;
    word:string;
    minScore:number; // default 0
    limit:number; // default 10
}

type HTTPResponse = Array<{
    word:string;
    score:number;
}>;

/**
 * This is a client for CNC's Word-Sim-Service (https://is.korpus.cz/git/machalek/word-sim-service)
 * which is just a glue for http server and word2vec handling libraries.
 */
export class CNCWord2VecSimApi implements WordSimApi<CNCWord2VecSimApiArgs> {

    private readonly apiURL:string;

    private readonly customHeaders:HTTPHeaders;

    private readonly cache:IAsyncKeyValueStore;

    private readonly srcInfoApi:CorpusInfoAPI;

    constructor(cache:IAsyncKeyValueStore, apiURL:string, srcInfoURL:string, customHeaders?:HTTPHeaders) {
        this.apiURL = apiURL;
        this.customHeaders = customHeaders || {};
        this.cache = cache;
        this.srcInfoApi = srcInfoURL ? new CorpusInfoAPI(cache, srcInfoURL, customHeaders) : null;
    }

    stateToArgs(state:WordSimModelState, query:string):CNCWord2VecSimApiArgs {
        return {
            corpus: state.corpus,
            word: query,
            limit: state.maxResultItems,
            minScore: state.minScore
        };
    }

    supportsTweaking():boolean {
        return false;
    }

    getSourceDescription(tileId:number, corpname:string):Observable<SourceDetails> {
        return this.srcInfoApi ?
            this.srcInfoApi.call({
                tileId: tileId,
                corpname: corpname,
                format: 'json'
            }) :
             rxOf({
                tileId: tileId,
                title: 'Word2Vec/Wang2Vec generated from an unknown source',
                description: '',
                author: '',
                href: ''
            });
    }

    call(queryArgs:CNCWord2VecSimApiArgs):Observable<WordSimApiResponse> {
        const url = this.apiURL + '/corpora/' + queryArgs.corpus + '/similarWords/' + queryArgs.word;
        return cachedAjax$<HTTPResponse>(this.cache)(
            'GET',
            url,
            {
                limit: queryArgs.limit,
                minScore: queryArgs.minScore
            },
            {headers: this.customHeaders}

        ).pipe(
            map(
                (ans) => ({words: ans.map(v => ({
                    word: v.word,
                    score: v.score,
                    interactionId: Ident.puid()
                }))})
            )
        );
    }
}