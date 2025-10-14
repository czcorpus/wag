/* Copyright 2025 Tomas Machalek <tomas.machalek@gmail.com>
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

import { catchError, map, Observable, of as rxOf } from 'rxjs';
import { Dict, HTTP, Ident, List, pipe } from 'cnc-tskit';
import urlJoin from 'url-join';

import {
    CorpusInfoAPI,
    QueryArgs,
} from '../../../../api/vendor/mquery/corpusInfo.js';
import { IApiServices } from '../../../../appServices.js';
import { IDataStreaming } from '../../../../page/streaming.js';
import { DataApi, ResourceApi, SourceDetails } from '../../../../types.js';
import {
    CNCWord2VecSimApiArgs,
    HTTPResponse,
    WordSimApiLegacyResponse,
    WordSimApiResponse,
    WSServerCorpusInfo,
} from './standard.js';
import { Backlink } from '../../../../page/tile.js';
import { ajax$ } from '../../../../page/ajax.js';
import { AjaxError } from 'rxjs/ajax';

interface WSServerItem {
    word: string;
    syntaxFn: Array<string>;
    score: number;
}

type WSServerResponse = Array<WSServerItem>;

/**
 * This is a client for CNC's Word-Sim-Service (https://is.korpus.cz/git/machalek/word-sim-service)
 * which is just a glue for http server and word2vec handling libraries.
 */
export class CNCWSServerApi
    implements ResourceApi<CNCWord2VecSimApiArgs, WordSimApiResponse>
{
    private readonly apiURL: string;

    private readonly apiServices: IApiServices;

    private readonly srcInfoApi: DataApi<QueryArgs, SourceDetails>;

    constructor(apiURL: string, srcInfoURL: string, apiServices: IApiServices) {
        this.apiURL = apiURL;
        this.apiServices = apiServices;
        this.srcInfoApi = srcInfoURL
            ? new CorpusInfoAPI(srcInfoURL, apiServices)
            : new WSServerCorpusInfo(apiURL, apiServices);
    }

    supportsTweaking(): boolean {
        return false;
    }

    supportsMultiWordQueries(): boolean {
        return false;
    }

    getSourceDescription(
        streaming: IDataStreaming,
        tileId: number,
        domain: string,
        corpname: string
    ): Observable<SourceDetails> {
        return this.srcInfoApi
            ? this.srcInfoApi.call(streaming, tileId, 0, {
                  corpname: corpname,
                  lang: domain,
              })
            : rxOf({
                  tileId: tileId,
                  title: 'Word2Vec/Wang2Vec generated from an unknown source',
                  description: '',
                  author: '',
                  href: '',
                  structure: {
                      numTokens: 0, // TODO
                  },
              });
    }

    getBacklink(queryId: number, subqueryId?: number): Backlink | null {
        return null;
    }

    private prepareArgs(queryArgs: CNCWord2VecSimApiArgs): string {
        return pipe(
            {
                ...queryArgs,
            },
            Dict.filter((v, k) => k === 'minScore' || k === 'limit'),
            Dict.toEntries(),
            List.map(([k, v]) => `${k}=${encodeURIComponent(v)}`),
            (x) => x.join('&')
        );
    }

    call(
        streaming: IDataStreaming,
        tileId: number,
        queryIdx: number,
        args: CNCWord2VecSimApiArgs | null
    ): Observable<WordSimApiResponse> {
        return streaming
            .registerTileRequest<WSServerResponse>({
                tileId,
                queryIdx,
                method: HTTP.Method.GET,
                url: args
                    ? urlJoin(
                          this.apiURL,
                          'dataset',
                          encodeURIComponent(args.corpus),
                          'similarWords',
                          encodeURIComponent(args.model),
                          encodeURIComponent(args.word)
                      ) +
                      '?' +
                      this.prepareArgs(args)
                    : '',
                body: {},
                contentType: 'application/json',
            })
            .pipe(
                map(
                    resp => ({
                        words: resp ? resp : [],
                    })
                )
            );
    }
}
