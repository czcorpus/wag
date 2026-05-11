/*
 * Copyright 2026 Tomas Machalek <tomas.machalek@gmail.com>
 * Copyright 2026 Department of Linguistics,
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

import { EMPTY, map, Observable, of as rxOf, tap } from 'rxjs';
import { IDataStreaming } from '../../../page/streaming.js';
import { ResourceApi, SourceDetails } from '../../../types.js';
import { Backlink } from '../../../page/tile.js';
import { HTTP, tuple } from 'cnc-tskit';
import urlJoin from 'url-join';

export interface GramatikatAPIArgs {
    lemma: string;
}

type GramatikatNumber = 'S' | 'P';

type GramatikatCase = '1' | '2' | '3' | '4' | '5' | '6' | '7';

type GramatikatSlot = `${GramatikatNumber}${GramatikatCase}`;

export interface GramatikatFreq {
    value: GramatikatSlot;
    proportion: number;
}

export interface GramatikatAPIResponse {
    freq: number;
    proportions: Array<GramatikatFreq>;
}

export interface GramatikatSourceDetail extends SourceDetails {}

export class GramatikatAPI
    implements ResourceApi<GramatikatAPIArgs, [GramatikatAPIResponse, number]>
{
    private readonly apiUrl: string;

    constructor(apiUrl: string) {
        this.apiUrl = apiUrl;
    }

    getSourceDescription(
        streaming: IDataStreaming,
        tileId: number,
        lang: string,
        corpname: string
    ): Observable<GramatikatSourceDetail> {
        return EMPTY;
    }

    getBacklink(queryId: number, subqueryId?: number): Backlink | null {
        return null;
    }

    call(
        streaming: IDataStreaming,
        tileId: number,
        queryIdx: number,
        args: GramatikatAPIArgs | null
    ): Observable<[GramatikatAPIResponse, number]> {
        console.log('Gramatikat API - ', this.apiUrl);
        return streaming
            .registerTileRequest<GramatikatAPIResponse>({
                tileId,
                queryIdx,
                method: HTTP.Method.POST,
                url: args ? urlJoin(this.apiUrl, 'lemma') : '',
                body: {
                    lemma: args.lemma,
                    pos: 'nouns',
                    category: 'numbercase',
                    corpus: 'syn2015_20_25',
                },
                isEventSource: false,
                contentType: 'application/json',
            })
            .pipe(
                tap((v) => {
                    console.log('we have response: ', v);
                }),
                map<GramatikatAPIResponse, GramatikatAPIResponse>((resp) =>
                    resp
                        ? resp
                        : {
                              freq: 0,
                              proportions: [],
                          }
                ),
                map((resp) => tuple(resp, queryIdx))
            );
    }
}
