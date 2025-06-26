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
import { Ident, HTTP, pipe, Dict, List } from 'cnc-tskit';

import { ajax$ } from '../../../page/ajax.js';
import { DataApi, ResourceApi, SourceDetails } from '../../../types.js';
import { map, catchError } from 'rxjs/operators';
import { AjaxError } from 'rxjs/ajax';
import { IApiServices } from '../../../appServices.js';
import { Backlink } from '../../../page/tile.js';
import urlJoin from 'url-join';
import { IDataStreaming } from '../../../page/streaming.js';
import { CorpusInfoAPI, QueryArgs, HTTPResponse as MQHTTPResponse }
    from '../../../api/vendor/mquery/corpusInfo.js';



export interface WordSimWord {
    word:string;
    score:number;
    interactionId?:string;
}

export type WordSimApiLegacyResponse = Array<WordSimWord>;

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
 *
 */
class WSServerCorpusInfo implements DataApi<QueryArgs, SourceDetails> {

    private readonly apiURL:string;

    private readonly apiServices:IApiServices;

    constructor(apiURL:string, apiServices:IApiServices) {
        this.apiURL = apiURL;
        this.apiServices = apiServices;
    }


    call(dataStreaming:IDataStreaming|null, tileId:number, queryIdx:number, args:QueryArgs):Observable<SourceDetails> {
        if (dataStreaming) {
            return dataStreaming.registerTileRequest<MQHTTPResponse>(
                {
                    tileId,
                    method: HTTP.Method.GET,
                    url: args ?
                        urlJoin(
                            this.apiURL,
                            'corpora',
                            encodeURIComponent(args.corpname),
                        ) :
                        '',
                    body: {},
                    contentType: 'application/json',
                }
            ).pipe(
                map<MQHTTPResponse, SourceDetails>(
                    (resp) => ({
                        tileId,
                        title: resp.corpus.data.corpname,
                        description: resp.corpus.data.description,
                        author: '',
                        href: resp.corpus.data.webUrl,
                        attrList: resp.corpus.data.attrList,
                        citationInfo: {
                            sourceName: resp.corpus.data.corpname,
                            main: resp.corpus.data.citationInfo?.default_ref,
                            papers: resp.corpus.data.citationInfo?.article_ref || [],
                            otherBibliography: resp.corpus.data.citationInfo?.other_bibliography || undefined
                        },

                        keywords: List.map(v => ({name: v, color: null}), resp.corpus.data.srchKeywords),
                    })
                )
            );


        } else {
            return ajax$(
                    HTTP.Method.GET,
                    urlJoin(
                        this.apiURL,
                        'corpora',
                        encodeURIComponent(args.corpname),
                    ),
                    {},
                    {contentType: 'application/json'},

            ).pipe(
                map<MQHTTPResponse, SourceDetails>(
                    (resp) => ({
                        tileId,
                        title: resp.corpus.data.corpname,
                        description: resp.corpus.data.description,
                        author: '',
                        href: resp.corpus.data.webUrl,
                        attrList: resp.corpus.data.attrList,
                        citationInfo: {
                            sourceName: resp.corpus.data.corpname,
                            main: resp.corpus.data.citationInfo?.default_ref,
                            papers: resp.corpus.data.citationInfo?.article_ref || [],
                            otherBibliography: resp.corpus.data.citationInfo?.other_bibliography || undefined
                        },

                        keywords: List.map(v => ({name: v, color: null}), resp.corpus.data.srchKeywords),
                    })
                )
            );
        }

    }


}

/**
 * This is a client for CNC's Word-Sim-Service (https://is.korpus.cz/git/machalek/word-sim-service)
 * which is just a glue for http server and word2vec handling libraries.
 */
export class CNCWord2VecSimApi implements ResourceApi<CNCWord2VecSimApiArgs, WordSimApiResponse> {

    private readonly apiURL:string;

    private readonly apiServices:IApiServices;

    private readonly srcInfoApi:DataApi<QueryArgs, SourceDetails>;

    constructor(
        apiURL:string,
        useDataStream:boolean,
        srcInfoURL:string,
        apiServices:IApiServices
    ) {
        this.apiURL = apiURL;
        this.apiServices = apiServices;
        this.srcInfoApi = srcInfoURL ?
            new CorpusInfoAPI(srcInfoURL, apiServices) :
            new WSServerCorpusInfo(apiURL, apiServices);
    }

    supportsTweaking():boolean {
        return false;
    }

    supportsMultiWordQueries():boolean {
        return false;
    }

    getSourceDescription(dataStreaming:IDataStreaming, tileId:number, domain:string, corpname:string):Observable<SourceDetails> {
        return this.srcInfoApi ?
            this.srcInfoApi.call(dataStreaming, tileId, 0, {
                corpname: corpname,
                lang: domain
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

    getBacklink(queryId:number, subqueryId?:number):Backlink|null {
        return null;
    }

    private prepareArgs(queryArgs:CNCWord2VecSimApiArgs):string {
        return pipe(
            {
                ...queryArgs
            },
            Dict.filter((v, k) => k === 'minScore' || k === 'limit'),
            Dict.toEntries(),
            List.map(
                ([k, v]) => `${k}=${encodeURIComponent(v)}`
            ),
            x => x.join('&')
        )
    }

    call(dataStreaming:IDataStreaming|null, tileId:number, queryIdx:number, args:CNCWord2VecSimApiArgs|null):Observable<WordSimApiResponse> {
        if (dataStreaming) {
            return this.apiServices.dataStreaming().registerTileRequest<WordSimApiLegacyResponse>(
                {
                    tileId,
                    method: HTTP.Method.GET,
                    url: args ?
                        urlJoin(
                            this.apiURL,
                            'corpora',
                            encodeURIComponent(args.corpus),
                            'similarWords',
                            encodeURIComponent(args.model),
                            encodeURIComponent(args.word),
                            encodeURIComponent(args.pos)
                        ) + '?' + this.prepareArgs(args) :
                        '',
                    body: {},
                    contentType: 'application/json',
                }
            ).pipe(
                map(
                    resp => resp ? {words: resp} : { words: [] }
                )
            );

        } else {
            const url = urlJoin(
                this.apiURL,
                'corpora',
                encodeURIComponent(args.corpus),
                'similarWords',
                encodeURIComponent(args.model),
                encodeURIComponent(args.word),
                encodeURIComponent(args.pos)
            ) + '?' + this.prepareArgs(args)
            return ajax$<WordSimApiLegacyResponse>(
                'GET',
                url,
                {
                    limit: args.limit,
                    minScore: args.minScore
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
}