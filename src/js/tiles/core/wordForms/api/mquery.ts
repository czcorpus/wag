/*
 * Copyright 2023 Martin Zimandl <martin.zimandl@gmail.com>
 * Copyright 2023 Institute of the Czech National Corpus,
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
import { Observable, map } from 'rxjs';

import { CorpusDetails, ResourceApi } from '../../../../types.js';
import { FreqRowResponse } from '../../../../api/vendor/mquery/common.js';
import { Dict, HTTP, Ident, List, pipe } from 'cnc-tskit';
import { RequestArgs, Response } from '../common.js';
import urlJoin from 'url-join';
import { WordFormsBacklinkAPI } from './backlink.js';
import { IDataStreaming } from '../../../../page/streaming.js';

export interface LemmaItem {
    lemma: string;
    pos: string;
    forms: Array<FreqRowResponse>;
}

export class MQueryWordFormsAPI
    extends WordFormsBacklinkAPI
    implements ResourceApi<RequestArgs, Response>
{
    private prepareArgs(queryArgs: RequestArgs): string {
        return pipe(
            {
                sublemma: queryArgs.sublemma,
                pos: queryArgs.pos.join(' '),
            },
            Dict.toEntries(),
            List.filter(([_, v]) => v !== undefined),
            List.map(([k, v]) => `${k}=${encodeURIComponent(v)}`),
            (x) => x.join('&')
        );
    }

    call(
        streaming: IDataStreaming,
        tileId: number,
        queryIdx: number,
        args: RequestArgs
    ): Observable<Response> {
        const url = args.lemma
            ? urlJoin(this.apiURL, '/word-forms/', args.corpName, args.lemma) +
              `?${this.prepareArgs(args)}`
            : null;
        return streaming
            .registerTileRequest<Array<LemmaItem>>({
                tileId,
                method: HTTP.Method.GET,
                url,
                body: {},
                contentType: 'application/json',
            })
            .pipe(
                map((resp) => {
                    if (!resp) {
                        return { forms: [] };
                    }
                    const totalCount = pipe(
                        resp,
                        List.flatMap((item) => item.forms),
                        List.reduce((acc, curr) => acc + curr.freq, 0)
                    );
                    return {
                        forms: pipe(
                            resp,
                            List.flatMap((match) => match.forms),
                            List.groupBy((item) => item.word),
                            List.map(([word, group]) => {
                                const freq = List.reduce(
                                    (a, v) => a + v.freq,
                                    0,
                                    group
                                );
                                return {
                                    value: word,
                                    freq,
                                    ratio: freq / totalCount,
                                    interactionId: Ident.puid(),
                                };
                            })
                        ),
                    };
                })
            );
    }

    getSourceDescription(
        streaming: IDataStreaming,
        tileId: number,
        lang: string,
        corpname: string
    ): Observable<CorpusDetails> {
        return this.srcInfoService.call(streaming, tileId, 0, {
            corpname,
            lang,
        });
    }

    supportsMultiWordQueries(): boolean {
        return false;
    }
}
