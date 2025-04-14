/*
 * Copyright 2025 Tomas Machalek <tomas.machalek@gmail.com>
 * Copyright 2025 Institute of the Czech National Corpus,
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
import { Ident, HTTP } from 'cnc-tskit';

import { ajax$ } from '../../../page/ajax.js';
import { ResourceApi, SourceDetails } from '../../../types.js';
import { map, catchError } from 'rxjs/operators';
import { AjaxError } from 'rxjs/ajax';
import { QueryType } from '../../../query/index.js';
import { IApiServices } from '../../../appServices.js';
import { InternalResourceInfoApi } from '../../../api/vendor/wdglance/freqDbSourceInfo.js';
import { Backlink } from '../../../page/tile.js';



export interface WordSimWord {
    word:string;
    score:number;
    interactionId?:string;
}

export interface WordSimApiResponse {
    words:Array<WordSimWord>;
}

export interface CNCWord2VecSimApiArgs {
    corpus:string;
    model:string;
    word:string;
    pos:string;
    minScore:number; // default 0
    limit:number; // default 10
}

type HTTPResponse = Array<{
    word:string;
    score:number;
}>;


export enum OperationMode {
    MeansLike = 'ml',
    SoundsLike = 'sl'
}

/**
 * This is a client for CNC's Word-Sim-Service (https://is.korpus.cz/git/machalek/word-sim-service)
 * which is just a glue for http server and word2vec handling libraries.
 */
export class CNCWord2VecSimApi implements ResourceApi<CNCWord2VecSimApiArgs, WordSimApiResponse> {

    private readonly apiURL:string;

    private readonly apiServices:IApiServices;

    private readonly srcInfoApi:InternalResourceInfoApi;

    constructor(
        apiURL:string,
        srcInfoURL:string,
        apiServices:IApiServices
    ) {
        this.apiURL = apiURL;
        this.apiServices = apiServices;
        this.srcInfoApi = srcInfoURL ? new InternalResourceInfoApi(srcInfoURL, apiServices) : null;
    }

    supportsTweaking():boolean {
        return false;
    }

    supportsMultiWordQueries():boolean {
        return false;
    }

    getSourceDescription(tileId:number, multicastRequest:boolean, domain:string, corpname:string):Observable<SourceDetails> {
        return this.srcInfoApi ?
            this.srcInfoApi.call(tileId, multicastRequest, {
                corpname: corpname,
                domain: domain,
                queryType: QueryType.SINGLE_QUERY
            }) :
             rxOf({
                tileId: tileId,
                title: 'Word2Vec/Wang2Vec generated from an unknown source',
                description: '',
                author: '',
                href: '',
                structure: {
                    numTokens: 0 // TODO
                }
            });
    }

    getBacklink(queryId:number):Backlink|null {
        return null;
    }

    call(tileId:number, multicastRequest:boolean, queryArgs:CNCWord2VecSimApiArgs):Observable<WordSimApiResponse> {
        const url = this.apiURL + '/corpora/' + queryArgs.corpus + '/similarWords/' + queryArgs.model +
                '/' + queryArgs.word + (queryArgs.pos ? '/' + queryArgs.pos : '');
        return ajax$<HTTPResponse>(
            'GET',
            url,
            {
                limit: queryArgs.limit,
                minScore: queryArgs.minScore
            },
            {
                headers: this.apiServices.getApiHeaders(this.apiURL),
                withCredentials: true
            }

        ).pipe(
            catchError(
                (err:AjaxError) => {
                    if (err.status === HTTP.Status.NotFound) {
                        return rxOf<HTTPResponse>([]);
                    }
                    throw err;
                }
            ),
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