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

import { map, Observable, scan, takeWhile } from 'rxjs';
import { CorpusDetails, ResourceApi } from '../../../types.js';
import { Backlink, BacklinkConf } from '../../../page/tile.js';
import { IApiServices } from '../../../appServices.js';
import { Dict, HTTP, List, pipe, tuple } from 'cnc-tskit';
import { FreqRowResponse } from './common.js';
import { CorpusInfoAPI } from './corpusInfo.js';
import { ajax$ } from '../../../page/ajax.js';
import urlJoin from 'url-join';
import { IDataStreaming } from '../../../page/streaming.js';


export interface TimeDistribArgs {

    corpname:string;

    q:string;

    fcrit:string;

    maxItems:number;

    subcorpName:string|undefined;

    fromYear:string|undefined;

    toYear:string|undefined;
}

export type CustomArgs = {[k:string]:string};

/**
 *
 */
export interface TimeDistribItem {

    datetime:string;

    /**
     * Absolute frequency
     */
    freq:number;

    /**
     * Size of a respective (sub)corpus in tokens
     */
    norm:number;
}

/**
 *
 */
export interface TimeDistribResponse {
    corpName:string;
    subcorpName?:string;
    concPersistenceID?:string;
    data:Array<TimeDistribItem>;
    overwritePrevious?:boolean;
}



export interface MqueryStreamData {
    chunkNum:number;
    totalChunks:number;
    error:string;
    entries:{
        concSize:number;
        corpusSize:number;
        searchSize:number;
        freqs:FreqRowResponse[];
    };
}

/**
 * Calculates min and max year in provided time distrib freq items.
 */
function getChunkYearRange(items:Array<FreqRowResponse>):[number, number] {
    return List.foldl(
        ([min, max], v) => {
            return tuple(
                parseInt(v.word) < min ? parseInt(v.word) : min,
                parseInt(v.word) > max ? parseInt(v.word) : max
            )
        },
        tuple(99999999999, 0),
        items
    )
}

/**
 * This is the main TimeDistrib API for KonText. It should work in any
 * case.
 */
export class MQueryTimeDistribStreamApi implements ResourceApi<TimeDistribArgs, TimeDistribResponse> {

    private readonly apiURL:string;

    private readonly srcInfoService:CorpusInfoAPI;

    private readonly useDataStream:boolean;

    private readonly apiServices:IApiServices;

    private readonly backlinkConf:BacklinkConf;

    constructor(apiURL:string, useDataStream:boolean, apiServices:IApiServices, backlinkConf:BacklinkConf) {
        this.apiURL = apiURL;
        this.useDataStream = useDataStream;
        this.apiServices = apiServices;
        this.srcInfoService = new CorpusInfoAPI(apiURL, apiServices);
        this.backlinkConf = backlinkConf;
    }

    getSourceDescription(streaming:IDataStreaming, tileId:number, lang:string, corpname:string):Observable<CorpusDetails> {
        return this.srcInfoService.call(streaming, tileId, 0, {corpname, lang});
    }

    getBacklink(queryId:number, subqueryId?:number):Backlink|null {
        return this.backlinkConf ?
            {
                queryId,
                subqueryId,
                label: this.backlinkConf.label || 'KonText',
            } :
            null;
    }

    private prepareArgs(tileId:number, queryIdx:number, queryArgs:TimeDistribArgs, eventSource?:boolean):string {
        return pipe(
            {
                ...queryArgs,
                event: eventSource ? `DataTile-${tileId}.${queryIdx}` : undefined
            },
            Dict.filter((v, k) => v !== undefined),
            Dict.map(
                (v, k) => encodeURIComponent(v)
            ),
            Dict.toEntries(),
            List.map(
                ([k, v]) => `${k}=${v}`
            ),
            x => x.join('&')
        )
    }

    public loadSecondWord(
        streaming:IDataStreaming,
        tileId:number,
        queryIdx:number,
        queryArgs:TimeDistribArgs
    ):Observable<TimeDistribResponse> {
        const args = this.prepareArgs(tileId, queryIdx, queryArgs, true);
        return streaming.registerTileRequest<MqueryStreamData>(
            {
                tileId,
                queryIdx,
                method: HTTP.Method.GET,
                url: `${this.apiURL}/time-dist-word?${args}`,
                body: {},
                contentType: 'application/json',
                isEventSource: true
            }
        ).pipe(
            scan<MqueryStreamData, {curr:MqueryStreamData; chunks:Map<number, boolean>}>(
                (acc, value) => {
                    acc.chunks.set(value.chunkNum, true)
                    acc.curr = value;
                    return acc;
                },
                {
                    curr: null,
                    chunks: new Map<number, boolean>()
                }
            ),
            takeWhile(
                ({curr, chunks}) => pipe(
                    Array.from(chunks.entries()),
                    List.filter(([k, v]) => !!v),
                    List.size()
                ) <= curr.totalChunks
            ),
            map(
                ({curr}) => {
                    if (curr.error) {
                        throw new Error(curr.error);
                    }
                    return {
                        corpName: queryArgs.corpname,
                        subcorpName: queryArgs.subcorpName,
                        data: List.map(
                            v => ({
                                datetime: v.word,
                                freq: v.freq,
                                norm: v.base
                            }),
                            curr.entries.freqs
                        ),
                        overwritePrevious: true
                    }
                }
            )
        )
    }

    /*

    // this serves for tile backend which themselves use streaming
    // and we have to determine whether they're complete.
    // For this, we expect JSON responses of the following form:
    // { ..., chunkNum: number, totalChunks: number}
    chunks:Map<number, boolean>;
    */
    private callViaDataStream(
        streaming:IDataStreaming,
        tileId:number,
        queryIdx:number,
        queryArgs:TimeDistribArgs
    ):Observable<TimeDistribResponse> {
        const args = this.prepareArgs(tileId, queryIdx, queryArgs, true);
        return this.apiServices.dataStreaming().registerTileRequest<MqueryStreamData>(
                {
                    tileId,
                    method: HTTP.Method.GET,
                    url: `${this.apiURL}/freqs-by-year-streamed/${queryArgs.corpname}?${args}`,
                    body: {},
                    contentType: 'application/json',
                    isEventSource: true
                }
        ).pipe(
            scan<MqueryStreamData, {curr:MqueryStreamData; chunks:Map<number, boolean>}>(
                (acc, value) => {
                    acc.chunks.set(value.chunkNum, true)
                    acc.curr = value;
                    return acc;
                },
                {
                    curr: null,
                    chunks: new Map<number, boolean>()
                }
            ),
            takeWhile(
                ({curr, chunks}) => pipe(
                    Array.from(chunks.entries()),
                    List.filter(([k, v]) => !!v),
                    List.size()
                ) <= curr.totalChunks
            ),
            map(
                ({curr}) => {
                    if (curr.error) {
                        throw new Error(curr.error);
                    }
                    return {
                        corpName: queryArgs.corpname,
                        subcorpName: queryArgs.subcorpName,
                        data: List.map(
                            v => ({
                                datetime: v.word,
                                freq: v.freq,
                                norm: v.base
                            }),
                            curr.entries.freqs
                        ),
                        overwritePrevious: true
                    }
                }
            )
        )
    }

    private callViaAjAX(tileId:number, queryIdx:number, queryArgs:TimeDistribArgs):Observable<TimeDistribResponse> {
        return new Observable(o => {
            const args = this.prepareArgs(tileId, queryIdx, queryArgs, true);
            const eventSource = new EventSource(`${this.apiURL}/freqs-by-year-streamed/${queryArgs.corpname}?${args}`);
            const procChunks:{[k:number]:number} = {};
            let minYear = queryArgs.fromYear ? parseInt(queryArgs.fromYear) : -1;
            let maxYear = queryArgs.toYear ? parseInt(queryArgs.toYear) : -1;

            eventSource.onmessage = (e) => {
                const message = JSON.parse(e.data) as MqueryStreamData;
                if (message.error) {
                    eventSource.close();
                    o.error(new Error(message.error));

                } else {
                    const [currMin, currMax] = getChunkYearRange(message.entries.freqs);
                    if (minYear > -1 && currMin < minYear) {
                        minYear = currMin;
                    }
                    if (maxYear > -1 && currMax > maxYear) {
                        maxYear = currMax;
                    }
                    o.next({
                        corpName: queryArgs.corpname,
                        subcorpName: queryArgs.subcorpName,
                        data: List.map(
                            v => ({
                                datetime: v.word,
                                freq: v.freq,
                                norm: v.base,
                            }),
                            message.entries.freqs,
                        ),
                        overwritePrevious: true,
                    });
                }

                if (message.chunkNum) { // valid chunk nums start with 1 (see Mquery docs)
                    procChunks[message.chunkNum] = (new Date().getTime()) / 1000;
                }

                const totalProc = pipe(
                    procChunks,
                    Dict.filter((v, k) => !!v),
                    Dict.size()
                );

                if (totalProc >= message.totalChunks) {
                    eventSource.close();
                    o.complete();
                }
            };

            eventSource.onerror = (e) => {
                console.log(e);
            };

        });
    }

    call(streaming:IDataStreaming, tileId:number, queryIdx:number, queryArgs:TimeDistribArgs):Observable<TimeDistribResponse> {
        return this.useDataStream ?
            this.callViaDataStream(streaming, tileId, queryIdx, queryArgs) :
            this.callViaAjAX(tileId, queryIdx, queryArgs);
    }

    requestBacklink(args:TimeDistribArgs):Observable<URL> {
        const concArgs = {
            corpname: args.corpname,
            q: `q${args.q}`,
            format: 'json',
        };
        if (args.subcorpName) {
            concArgs['subcorpus'] = args.subcorpName;
        }
        return ajax$<{conc_persistence_op_id:string}>(
            'GET',
            urlJoin(this.backlinkConf.url, 'create_view'),
            concArgs,
            {
                headers: this.apiServices.getApiHeaders(this.apiURL),
                withCredentials: true,
            }
        ).pipe(
            map(resp => {
                const url = new URL(urlJoin(this.backlinkConf.url, 'freqs'));
                url.searchParams.set('corpname', args.corpname);
                if (args.subcorpName) {
                    url.searchParams.set('subcorpus', args.subcorpName);
                }
                url.searchParams.set('q', `~${resp.conc_persistence_op_id}`);
                url.searchParams.set('fcrit', args.fcrit);
                url.searchParams.set('freq_type', 'text-types');
                url.searchParams.set('freq_sort', '0');
                return url;
            })
        );
    }
}
