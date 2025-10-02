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

import { catchError, concatMap, map, Observable, scan, takeWhile } from 'rxjs';
import urlJoin from 'url-join';

import { DataApi } from '../../../types.js';
import { Backlink, BacklinkConf } from '../../../page/tile.js';
import { IApiServices } from '../../../appServices.js';
import { Dict, HTTP, List, pipe, tuple } from 'cnc-tskit';
import { FreqRowResponse } from './common.js';
import { ajax$ } from '../../../page/ajax.js';
import { IDataStreaming } from '../../../page/streaming.js';

export interface TimeDistribArgs {
    corpname: string;

    q: string;

    fcrit: string;

    maxItems: number;

    subcorpName: string | undefined;

    fromYear: string | undefined;

    toYear: string | undefined;
}

export type CustomArgs = { [k: string]: string };

/**
 *
 */
export interface TimeDistribItem {
    datetime: string;

    /**
     * Absolute frequency
     */
    freq: number;

    /**
     * Size of a respective (sub)corpus in tokens
     */
    norm: number;
}

/**
 *
 */
export interface TimeDistribResponse {
    corpName: string;
    subcorpName?: string;
    concPersistenceID?: string;
    data: Array<TimeDistribItem>;
    overwritePrevious?: boolean;
}

export interface MqueryStreamData {
    chunkNum: number;
    totalChunks: number;
    error: string;
    entries: {
        concSize: number;
        corpusSize: number;
        searchSize: number;
        freqs: FreqRowResponse[];
    };
}

/**
 * Calculates min and max year in provided time distrib freq items.
 */
function getChunkYearRange(items: Array<FreqRowResponse>): [number, number] {
    return List.foldl(
        ([min, max], v) => {
            return tuple(
                parseInt(v.word) < min ? parseInt(v.word) : min,
                parseInt(v.word) > max ? parseInt(v.word) : max
            );
        },
        tuple(99999999999, 0),
        items
    );
}

/**
 * This is the main TimeDistrib API for KonText. It should work in any
 * case.
 */
export class MQueryTimeDistribStreamApi
    implements DataApi<TimeDistribArgs, TimeDistribResponse>
{
    private readonly apiURL: string;

    private readonly apiServices: IApiServices;

    private readonly backlinkConf: BacklinkConf;

    constructor(
        apiURL: string,
        apiServices: IApiServices,
        backlinkConf: BacklinkConf
    ) {
        this.apiURL = apiURL;
        this.apiServices = apiServices;
        this.backlinkConf = backlinkConf;
    }

    getBacklink(queryId: number, subqueryId?: number): Backlink | null {
        return this.backlinkConf
            ? {
                  queryId,
                  subqueryId,
                  label: this.backlinkConf.label || 'KonText',
                  async: true,
              }
            : null;
    }

    private prepareArgs(
        tileId: number,
        queryIdx: number,
        queryArgs: TimeDistribArgs,
        eventSource?: boolean
    ): string {
        return pipe(
            {
                ...queryArgs,
                event: eventSource
                    ? `DataTile-${tileId}.${queryIdx}`
                    : undefined,
            },
            Dict.filter((v, k) => v !== undefined),
            Dict.map((v, k) => encodeURIComponent(v)),
            Dict.toEntries(),
            List.map(([k, v]) => `${k}=${v}`),
            (x) => x.join('&')
        );
    }

    public loadSecondWord(
        streaming: IDataStreaming,
        tileId: number,
        queryIdx: number,
        queryArgs: TimeDistribArgs
    ): Observable<TimeDistribResponse> {
        const args = this.prepareArgs(tileId, queryIdx, queryArgs, true);
        return streaming
            .registerTileRequest<MqueryStreamData>({
                tileId,
                queryIdx,
                method: HTTP.Method.GET,
                url: `${this.apiURL}/time-dist-word?${args}`,
                body: {},
                contentType: 'application/json',
                isEventSource: true,
            })
            .pipe(
                scan<
                    MqueryStreamData,
                    { curr: MqueryStreamData; chunks: Map<number, boolean> }
                >(
                    (acc, value) => {
                        acc.chunks.set(value.chunkNum, true);
                        acc.curr = value;
                        return acc;
                    },
                    {
                        curr: null,
                        chunks: new Map<number, boolean>(),
                    }
                ),
                takeWhile(
                    ({ curr, chunks }) =>
                        pipe(
                            Array.from(chunks.entries()),
                            List.filter(([k, v]) => !!v),
                            List.size()
                        ) <= curr.totalChunks
                ),
                map(({ curr }) => {
                    if (curr.error) {
                        throw new Error(curr.error);
                    }
                    return {
                        corpName: queryArgs.corpname,
                        subcorpName: queryArgs.subcorpName,
                        data: List.map(
                            (v) => ({
                                datetime: v.word,
                                freq: v.freq,
                                norm: v.base,
                            }),
                            curr.entries.freqs
                        ),
                        overwritePrevious: true,
                    };
                })
            );
    }

    /*

    // this serves for tile backend which themselves use streaming
    // and we have to determine whether they're complete.
    // For this, we expect JSON responses of the following form:
    // { ..., chunkNum: number, totalChunks: number}
    chunks:Map<number, boolean>;
    */
    call(
        streaming: IDataStreaming,
        tileId: number,
        queryIdx: number,
        queryArgs: TimeDistribArgs
    ): Observable<TimeDistribResponse> {
        return streaming
            .registerTileRequest<MqueryStreamData>({
                tileId,
                queryIdx,
                method: HTTP.Method.GET,
                url: queryArgs
                    ? `${this.apiURL}/freqs-by-year-streamed/${queryArgs.corpname}?${this.prepareArgs(tileId, queryIdx, queryArgs, true)}`
                    : '',
                body: {},
                contentType: 'application/json',
                isEventSource: true,
            })
            .pipe(
                scan<
                    MqueryStreamData,
                    { curr: MqueryStreamData; chunks: Map<number, boolean> }
                >(
                    (acc, value) => {
                        if (value) {
                            acc.chunks.set(value.chunkNum, true);
                            acc.curr = value;
                        }
                        return acc;
                    },
                    {
                        curr: null,
                        chunks: new Map<number, boolean>(),
                    }
                ),
                takeWhile(
                    ({ curr, chunks }) =>
                        curr &&
                        pipe(
                            Array.from(chunks.entries()),
                            List.filter(([k, v]) => !!v),
                            List.size()
                        ) <= curr.totalChunks
                ),
                map(({ curr }) => {
                    if (curr.error) {
                        throw new Error(curr.error);
                    }
                    return {
                        corpName: queryArgs.corpname,
                        subcorpName: queryArgs.subcorpName,
                        data: List.map(
                            (v) => ({
                                datetime: v.word,
                                freq: v.freq,
                                norm: v.base,
                            }),
                            curr.entries.freqs
                        ),
                        overwritePrevious: true,
                    };
                })
            );
    }

    requestBacklink(args: TimeDistribArgs): Observable<URL> {
        const concArgs = {
            corpname: args.corpname,
            q: `q${args.q}`,
            format: 'json',
        };
        if (args.subcorpName) {
            concArgs['subcorpus'] = args.subcorpName;
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
                const url = new URL(urlJoin(this.backlinkConf.url, 'freqs'));
                url.searchParams.set('corpname', args.corpname);
                if (args.subcorpName) {
                    url.searchParams.set('subcorpus', args.subcorpName);
                }
                url.searchParams.set('q', `~${resp.conc_persistence_op_id}`);
                url.searchParams.set('fcrit', args.fcrit);
                url.searchParams.set('freq_type', 'text-types');
                url.searchParams.set('freq_sort', '0');

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
}
