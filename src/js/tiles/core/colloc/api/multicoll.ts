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
import { Observable } from 'rxjs';
import { catchError, concatMap, map, tap } from 'rxjs/operators';
import { Dict, HTTP, List, pipe, tuple } from 'cnc-tskit';
import urlJoin from 'url-join';

import { ajax$ } from '../../../../page/ajax.js';
import { CorpusDetails, ResourceApi } from '../../../../types.js';
import { CorpusInfoAPI } from '../../../../api/vendor/mquery/corpusInfo.js';
import { Backlink, BacklinkConf } from '../../../../page/tile.js';
import { IApiServices } from '../../../../appServices.js';
import { CollApiResponse } from '../common.js';
import { IDataStreaming } from '../../../../page/streaming.js';
import { BasicHTTPResponse, measureMap, MQueryCollArgs } from './index.js';
import { ConcResponse } from '../../../../api/vendor/mquery/concordance/common.js';
import { ConcApiArgs } from '../../../../api/vendor/mquery/concordance/index.js';

export interface CollConf {
    action: 'coll';
    corpusId: string;
    args: {
        minFreq: number;
        minItems: number;
    };
}

export interface ConcConf {
    action: 'conc';
    corpusId: string;
    args: {
        maxRows: number;
    };
}

export interface CollArgs {
    action: 'coll';
    corpusId: string;
    args: MQueryCollArgs & { minItems: number };
}

export interface ConcArgs {
    action: 'conc';
    corpusId: string;
    args: ConcApiArgs;
}

export class MQueryMultiCollAPI
    implements ResourceApi<MQueryCollArgs, CollApiResponse>
{
    private readonly apiURL: string;

    private readonly apiServices: IApiServices;

    private readonly srcInfoService: CorpusInfoAPI;

    private readonly backlinkConf: BacklinkConf;

    private readonly multiCollConf: Array<CollConf | ConcConf>;

    constructor(
        apiURL: string,
        apiServices: IApiServices,
        backlinkConf: BacklinkConf,
        multiCollConf: Array<CollConf | ConcConf>
    ) {
        this.apiURL = apiURL;
        this.apiServices = apiServices;
        this.srcInfoService = new CorpusInfoAPI(apiURL, apiServices);
        this.backlinkConf = backlinkConf;
        this.multiCollConf = multiCollConf;
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

    supportsLeftRightContext(): boolean {
        return true;
    }

    supportsMultiWordQueries(): boolean {
        return false;
    }

    private mkUrl(args: MQueryCollArgs, event: string): string {
        return (
            urlJoin(this.apiURL, 'multi-colloc-extended') +
            `?q=${encodeURIComponent(args.q)}&event=${encodeURIComponent(event)}`
        );
    }

    private mkRequest(
        streaming: IDataStreaming,
        tileId: number,
        queryIdx: number,
        args: MQueryCollArgs | null
    ): Observable<BasicHTTPResponse> {
        return streaming
            .registerTileRequest<BasicHTTPResponse | ConcResponse>({
                tileId,
                queryIdx,
                method: HTTP.Method.POST,
                url: args
                    ? this.mkUrl(args, `DataTile-${tileId}.${queryIdx}`)
                    : '',
                body: args ? this.makeArgs(args) : '',
                isEventSource: true,
                contentType: 'application/json',
            })
            .pipe(
                map((resp) =>
                    resp &&
                    (resp.resultType == 'coll' ||
                        resp.resultType == 'collWithExamples')
                        ? resp
                        : {
                              concSize: 0,
                              corpname: '',
                              corpusSize: 0,
                              colls: [],
                              measure: null,
                              srchRange: tuple(0, 0),
                              resultType: 'coll',
                          }
                )
            );
    }

    call(
        streaming: IDataStreaming,
        tileId: number,
        queryIdx: number,
        args: MQueryCollArgs | null
    ): Observable<CollApiResponse> {
        return this.mkRequest(streaming, tileId, queryIdx, args).pipe(
            map((v) => ({
                corpname: v.corpname,
                concId: undefined,
                collHeadings: [
                    {
                        label: '-', // will be replaced by the tile
                        ident: pipe(
                            measureMap,
                            Dict.find((v2, k) => v.measure === v2),
                            (srch) => (srch ? srch[0] : '-')
                        ),
                    },
                ],
                data: List.map(
                    (x) => ({
                        str: x.word,
                        stats: [x.score],
                        freq: x.freq,
                        nfilter: [null, null],
                        pfilter: [null, null],
                        interactionId: x.interactionId,
                    }),
                    v.colls
                ),
                cmpData: v.cmpColls,
            }))
        );
    }

    getBacklink(queryId: number): Backlink | null {
        if (this.backlinkConf && this.backlinkConf.url) {
            return {
                queryId,
                label: this.backlinkConf.label || 'KonText',
                async: true,
            };
        }
        return null;
    }

    requestBacklink(args: MQueryCollArgs): Observable<URL> {
        const concArgs = {
            corpname: args.corpusId,
            q: `q${args.q}`,
            format: 'json',
        };
        if (args.subcorpus) {
            concArgs['subcorpus'] = args.subcorpus;
        }
        return ajax$<{ conc_persistence_op_id: string }>(
            'GET',
            urlJoin(this.backlinkConf.url, 'create_view'),
            concArgs,
            {
                headers: this.apiServices.getApiHeaders(this.apiURL),
                withCredentials: true,
            }
        ).pipe(
            concatMap((resp) => {
                const url = new URL(urlJoin(this.backlinkConf.url, 'collx'));
                url.searchParams.set('corpname', args.corpusId);
                if (args.subcorpus) {
                    url.searchParams.set('subcorpus', args.subcorpus);
                }
                url.searchParams.set('q', `~${resp.conc_persistence_op_id}`);
                url.searchParams.set('cfromw', `-${args.srchLeft.toString()}`);
                url.searchParams.set('ctow', args.srchRight.toString());
                url.searchParams.set('cminfreq', args.minCollFreq.toString());

                // Validate the constructed URL
                return ajax$('GET', url.toString(), null, {
                    headers: this.apiServices.getApiHeaders(this.apiURL),
                    withCredentials: true,
                }).pipe(
                    catchError((err) => {
                        if (err.status === 401 || err.status === 403) {
                            throw new Error('global__kontext_login_required');
                        }
                        throw err;
                    }),
                    map(() => url)
                );
            })
        );
    }

    makeArgs(cArgs: MQueryCollArgs): Array<CollArgs | ConcArgs> {
        return List.map((conf) => {
            switch (conf.action) {
                case 'coll':
                    return {
                        action: 'coll',
                        corpusId: conf.corpusId,
                        args: {
                            ...cArgs,
                            minCollFreq: conf.args.minFreq,
                            minItems: conf.args.minItems,
                        },
                    } as CollArgs;
                case 'conc':
                    return {
                        action: 'conc',
                        corpusId: conf.corpusId,
                        args: {
                            maxRows: conf.args.maxRows,
                        },
                    } as ConcArgs;
            }
        }, this.multiCollConf);
    }
}
