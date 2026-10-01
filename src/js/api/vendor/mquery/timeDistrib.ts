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

import {
    catchError,
    concatMap,
    map,
    mergeMap,
    Observable,
    scan,
    takeWhile,
    tap,
} from 'rxjs';
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

    autobin: string | undefined;
}

export function isTimeDistribArgs(
    v: TimeDistribArgs | MergedTimeDistribArgs
): v is TimeDistribArgs {
    return v['corpname'] !== undefined && v['corpora'] === undefined;
}

export interface MergedTimeDistribArgs {
    maxItems: number;
    event: string;

    corpora: Array<{
        corpname: string;
        q: string;
        attr: string;
        fcrit: string;
        flimit: number;
        fromYear: number;
        toYear: number;
    }>;
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
    data: Array<TimeDistribItem>;
    overwritePrevious?: boolean;
}

interface FreqData {
    concSize: number;
    corpusSize: number;
    searchSize: number;
    freqs: FreqRowResponse[];
}

export interface MqueryStreamData {
    chunkNum: number;
    totalChunks: number;
    error: string;
    entries: FreqData;
}

export interface MqueryCorpBoundStreamData extends MqueryStreamData {
    corpname: string;
    subcname: string;
}

function mergeMqueryCorpBoundStreamData(
    data: Map<string, MqueryCorpBoundStreamData>
): Array<FreqRowResponse> {
    return pipe(
        [] as Array<MqueryCorpBoundStreamData>,
        (x) => x.concat(...Array.from(data.values())),
        List.flatMap((v) => v.entries.freqs),
        List.reduce((merged, freqInfo) => {
            const curr = merged.get(freqInfo.word);
            if (curr === undefined) {
                merged.set(freqInfo.word, freqInfo);
            } else {
                merged.set(freqInfo.word, {
                    base: curr.base + freqInfo.base,
                    collScore: undefined,
                    freq: curr.freq + freqInfo.freq,
                    ipm: undefined,
                    word: freqInfo.word,
                });
            }
            return merged;
        }, new Map<string, FreqRowResponse>()),
        (x) => Array.from(x.entries()),
        List.map(([, v]) => v)
    );
}

export interface MqueryMergeStreamData {
    error: string;
    parts: Array<MqueryCorpBoundStreamData>;
}

function isMqueryMergeStreamData(
    md: MqueryStreamData | MqueryMergeStreamData
): md is MqueryMergeStreamData {
    return Array.isArray(md['parts']);
}

function createMqueryStreamDataKey(data: MqueryCorpBoundStreamData): string {
    return `${data.corpname}:${data.subcname}`;
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
            Dict.filter((v, k) => v !== undefined && k !== 'corpname'),
            Dict.map((v, k) => encodeURIComponent(v)),
            Dict.toEntries(),
            List.map(([k, v]) => `${k}=${v}`),
            (x) => x.join('&')
        );
    }

    private prepareMultiCorpArgs(
        tileId: number,
        queryIdx: number,
        queryArgs: MergedTimeDistribArgs,
        eventSource?: boolean
    ): MergedTimeDistribArgs {
        return {
            ...queryArgs,
            event: eventSource ? `DataTile-${tileId}.${queryIdx}` : undefined,
        };
    }

    private generateURL(
        tileId: number,
        queryIdx: number,
        queryArgs: TimeDistribArgs | MergedTimeDistribArgs
    ): [HTTP.Method, string | null, {}] {
        if (!queryArgs) {
            return null;
        }
        if (isTimeDistribArgs(queryArgs)) {
            return tuple(
                HTTP.Method.GET,
                `${this.apiURL}/freqs-by-year-streamed/${queryArgs.corpname}?${this.prepareArgs(tileId, queryIdx, queryArgs, true)}`,
                {}
            );
        }
        return tuple(
            HTTP.Method.POST,
            `${this.apiURL}/merge-freqs-by-year-streamed?`,
            this.prepareMultiCorpArgs(tileId, queryIdx, queryArgs, true)
        );
    }

    private processResponse(
        data: Observable<MqueryStreamData | MqueryMergeStreamData>,
        queryArgs: TimeDistribArgs | MergedTimeDistribArgs
    ): Observable<TimeDistribResponse> {
        return data.pipe(
            scan<
                MqueryStreamData | MqueryMergeStreamData,
                {
                    chunks: Map<string, Set<number>>;
                    totals: Map<string, number>;
                    lastItems: Map<string, MqueryCorpBoundStreamData>;
                }
            >(
                (acc, value) => {
                    if (isMqueryMergeStreamData(value)) {
                        pipe(
                            value.parts,
                            List.filter((v) => v.chunkNum !== undefined),
                            List.forEach((part) => {
                                const key = createMqueryStreamDataKey(part);
                                acc.totals.set(key, part.totalChunks);
                                const currChunks =
                                    acc.chunks.get(key) || new Set();
                                currChunks.add(part.chunkNum);
                                acc.chunks.set(key, currChunks);
                                acc.lastItems.set(key, part);
                            })
                        );
                    } else if (isTimeDistribArgs(queryArgs)) {
                        const corpBoundVal: MqueryCorpBoundStreamData = {
                            ...value,
                            corpname: queryArgs.corpname,
                            subcname: queryArgs.subcorpName,
                        };
                        const key = createMqueryStreamDataKey(corpBoundVal);
                        acc.totals.set(key, value.totalChunks);
                        const currChunks = acc.chunks.get(key) || new Set();
                        currChunks.add(value.chunkNum);
                        acc.chunks.set(key, currChunks);
                        acc.lastItems.set(key, corpBoundVal);
                    }

                    return acc;
                },
                {
                    chunks: new Map<string, Set<number>>(),
                    totals: new Map<string, number>(),
                    lastItems: new Map<string, MqueryCorpBoundStreamData>(),
                }
            ),
            takeWhile(({ chunks, totals }) => {
                return pipe(
                    Array.from(chunks.entries()),
                    List.some(([k, v]) => v.size <= totals.get(k))
                );
            }),
            map(({ lastItems }) => {
                const merged = mergeMqueryCorpBoundStreamData(lastItems);
                return {
                    corpName: '-',
                    data: List.map(
                        (v) => ({
                            datetime: v.word,
                            freq: v.freq,
                            norm: v.base,
                        }),
                        merged
                    ),
                    overwritePrevious: true,
                };
            })
        );
    }

    public loadSecondWord(
        streaming: IDataStreaming,
        tileId: number,
        queryIdx: number,
        queryArgs: TimeDistribArgs | MergedTimeDistribArgs
    ): Observable<TimeDistribResponse> {
        return this.processResponse(
            streaming.registerTileRequest<
                MqueryStreamData | MqueryMergeStreamData
            >({
                tileId,
                queryIdx,
                method: isTimeDistribArgs(queryArgs)
                    ? HTTP.Method.GET
                    : HTTP.Method.POST,
                url: isTimeDistribArgs(queryArgs)
                    ? `${this.apiURL}/time-dist-word?${this.prepareArgs(tileId, queryIdx, queryArgs, true)}`
                    : `${this.apiURL}/merge-time-dist-word`,
                body: isTimeDistribArgs(queryArgs)
                    ? {}
                    : this.prepareMultiCorpArgs(
                          tileId,
                          queryIdx,
                          queryArgs,
                          true
                      ),
                contentType: 'application/json',
                isEventSource: true,
            }),
            queryArgs
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
        queryArgs: TimeDistribArgs | MergedTimeDistribArgs
    ): Observable<TimeDistribResponse> {
        const [method, url, body] = this.generateURL(
            tileId,
            queryIdx,
            queryArgs
        );
        return this.processResponse(
            streaming.registerTileRequest<MqueryStreamData>({
                tileId,
                queryIdx,
                method,
                url,
                body,
                contentType: 'application/json',
                isEventSource: true,
            }),
            queryArgs
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
