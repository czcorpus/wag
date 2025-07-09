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

import { HTTP, Ident, List, pipe, tuple } from 'cnc-tskit';
import { EMPTY, Observable, of as rxOf, Subject } from 'rxjs';
import { concatMap, filter, first, map, scan, share, tap, timeout } from 'rxjs/operators';
import { ajax$, encodeArgs } from './ajax.js';
import urlJoin from 'url-join';
import { UserConf, UserQuery } from '../conf/index.js';
import { QueryType } from '../query/index.js';


interface TileRequest {
    tileId:number;

    /**
     * 0 or undefined for single mode and first query in the cmp mode, 1,2,... for other queries
     * in cmp mode.
     */
    queryIdx?:number;
    url:string;
    method:HTTP.Method,
    body:unknown;
    contentType:string;
    base64EncodeResult?:boolean;

    // Specifies whether the backend itself provides
    // EventSource stream. In such case, we must integrate
    // this stream into the main one.
    isEventSource?:boolean;
}

/**
 * OtherTileRequest is a pseudo-request which relies on other
 * tile's true request.
 */
interface OtherTileRequest {
    tileId:number;
    queryIdx?:number;
    otherTileId:number;
    otherTileQueryIdx?:number;
    contentType:string;
    base64EncodeResult?:boolean;
}

function isOtherTileRequest(t:TileRequest|OtherTileRequest):t is OtherTileRequest {
    return typeof t['otherTileId'] === 'number';
}

function normalizeRequest<T extends TileRequest|OtherTileRequest>(req:T):T {
    if (isOtherTileRequest(req)) {
        return {
            ...req,
            queryIdx: typeof req.queryIdx === 'number' ? req.queryIdx : 0,
            otherQueryIdx: typeof req.otherTileQueryIdx === 'number' ? req.otherTileQueryIdx : 0,
        };
    }
    return {
        ...req,
        queryIdx: typeof req.queryIdx === 'number' ? req.queryIdx : 0
    }
}

interface EventItem<T = unknown> {
    tileId:number;
    queryIdx:number;
    data:T;
    error?:string;
}

interface RequestTag {
    applicationId:string;
    queries:Array<UserQuery>;
    queryType:QueryType;
    translatLang?:string;
}

export interface IDataStreaming {
    registerTileRequest<T>(entry:TileRequest|OtherTileRequest):Observable<T>;

    getId():string;

    startNewSubgroup(mainTileId:number, ...dependentTiles:Array<number>):IDataStreaming;

    getSubgroup(subgroupId:string):IDataStreaming;
}

export class EmptyDataStreaming implements IDataStreaming {

    registerTileRequest<T>(entry:TileRequest|OtherTileRequest):Observable<T> {
        return EMPTY;
    }

    getId(): string {
        return "empty";
    }

    startNewSubgroup(mainTileId:number, ...dependentTiles:Array<number>):IDataStreaming {
        return undefined;
    }

    getSubgroup(subgroupId:string):IDataStreaming {
        return undefined;
    }
}

/**
 * DataStreaming serves as a controller for EventSource-based communication
 * between EventSource-capable server (APIGuard in case of the CNC) and individual
 * tiles who register themselves via registerTileRequest() method and wait
 * for their data.
 * The class is written in a way capable of handling fully asynchronous nature
 * of WaG tiles where each tile reacts to the current word data individually and
 * also individually processes its data.
 */
export class DataStreaming implements IDataStreaming {

    private readonly requestSubject:Subject<TileRequest|OtherTileRequest>;

    private readonly responseStream:Observable<EventItem>;

    private readonly rootUrl:string|null;

    private readonly reqTag:RequestTag|null;

    private readonly tilesReadyTimeoutSecs:number;

    private readonly userSession:UserConf|null;

    private readonly tilesDataStreams:{[streamId:string]:DataStreaming};

    private readonly id:string;

    static readonly ID_GLOBAL = '__global__';

    constructor(
        id:string|null,
        tileIds:Array<string|number>,
        rootUrl:string|null,
        tilesReadyTimeoutSecs:number,
        userSession:UserConf|null
    ) {
        this.id = id ? id : DataStreaming.ID_GLOBAL;
        this.rootUrl = rootUrl;
        this.tilesReadyTimeoutSecs = tilesReadyTimeoutSecs;
        this.reqTag = userSession ? this.mkQueryTag(userSession) : undefined;
        this.userSession = userSession;
        this.tilesDataStreams = {};
        this.requestSubject = new Subject<TileRequest|OtherTileRequest>();
        this.responseStream = this.rootUrl ?
            this.requestSubject.pipe(
                scan(
                    (acc, value) => {
                        const key = `${value.tileId}.${value.queryIdx}`;
                        if (acc.get(key) === undefined) {
                            acc.set(key, value);
                        }
                        return acc;
                    },
                    new Map(
                        pipe(
                            tileIds,
                            List.map<number|string, Array<[string, TileRequest|OtherTileRequest|undefined]>>(
                                v => List.repeat(
                                    i => tuple(`${v}.${i}`, undefined),
                                    userSession ? List.size(userSession.queries) : 1
                                ),
                            ),
                            List.flatMap(x => x)
                        )
                    )
                ),
                // TODO, remove when in production-ready quality
                tap(
                    v => {
                        console.log('tile dispatching status:');
                        v.forEach((v, k) => {
                            console.log('   ', k, ': ', v);
                        })

                    }
                ),
                first(
                    v => {
                        for (const [key, value] of v) {
                            if (value === undefined) {
                                return false;
                            }
                        }
                        return true
                    }
                ),
                timeout(this.tilesReadyTimeoutSecs),
                concatMap(
                    tileReqMap => ajax$<{id:string}>(
                        HTTP.Method.PUT,
                        this.rootUrl,
                        {
                            requests: pipe(
                                Array.from(tileReqMap.entries()),
                                List.map(
                                    ([k, tileReq]) => tileReq
                                )
                            ),
                            tag: this.reqTag
                        },
                        {
                            contentType: 'application/json'
                        }
                    ).pipe(
                        map(
                            resp => tuple(tileReqMap, resp)
                        )
                    )
                ),
                concatMap(
                    ([tileReqMap, resp]) => new Observable<EventItem>(
                        observer => {
                            const evtSrc = new EventSource(
                                urlJoin(this.rootUrl, resp.id)
                            );
                            tileReqMap.forEach(
                                (val, key) => {
                                    evtSrc.addEventListener(`DataTile-${val.tileId}.${val.queryIdx}`, evt => {
                                        if (val.contentType == 'application/json') {
                                            try {
                                                const tmp = JSON.parse(evt.data);
                                                observer.next({
                                                    data: tmp,
                                                    error: !!tmp && tmp.hasOwnProperty('error') ? tmp.error : undefined,
                                                    tileId: val.tileId,
                                                    queryIdx: val.queryIdx
                                                });

                                            } catch (e) {
                                                observer.next({
                                                    data: undefined,
                                                    error: `Failed to process response for tile ${val.tileId}: ${e}`,
                                                    tileId: val.tileId,
                                                    queryIdx: val.queryIdx
                                                });
                                            }

                                        } else if (val.base64EncodeResult && typeof evt.data === 'string') {
                                            const tmp = atob(evt.data);
                                            observer.next({
                                                data: tmp,
                                                tileId: val.tileId,
                                                queryIdx: val.queryIdx
                                            })

                                        } else {
                                            observer.next({
                                                data: evt.data,
                                                tileId: val.tileId,
                                                queryIdx: val.queryIdx
                                            })
                                        }
                                    });
                                }
                            );
                            evtSrc.addEventListener('close', () => {
                                observer.complete();
                                evtSrc.close();
                            })
                            evtSrc.onerror = v => {
                                console.error(v);
                                if (evtSrc.readyState === EventSource.CLOSED) {
                                    evtSrc.close();
                                    observer.complete();
                                }
                            }
                        }
                    )
                ),
                share()
            ) :
            EMPTY;
        if (typeof window !== 'undefined') {
            this.responseStream.subscribe({
                error: error => {
                    console.log(`response stream error for tile group ${tileIds.join(',')}: ${error}`)
                }
            });
        }
    }

    getId():string {
        return this.id;
    }

    /**
     * Creates a new DataStreaming instance with custom
     * group of tiles. This is mostly used for:
     *
     * 1) obtaining source info (single tile stream)
     * 2) updating independent tile's parameters (single tile stream)
     * 3) updating dependent tiles (typically - two tile stream)
     *
     * The new instance does not produce caching tag which
     * means the corresponding responses are not cached!
     *
     * The stream, once created, starts to measure time
     * and handle possible timeout so it is important
     * not to call this too early (like during a model
     * instantiation).
     *
     * The method returns a unique identifier of the subgroup
     * and the caller should dispatch an action informing
     * that the group is ready so dependent tiles may react
     * accordingly (i.e. get the stream and register their requests).
     *
     * @param tiles
     * @returns
     */
    startNewSubgroup(mainTileId:number, ...dependentTiles:Array<number>):DataStreaming {
        const groupId = Ident.puid();
        this.tilesDataStreams[groupId] = new DataStreaming(
            groupId,
            [mainTileId,...dependentTiles],
            this.rootUrl,
            this.tilesReadyTimeoutSecs,
            null
        );
        return this.tilesDataStreams[groupId];
    }

    /**
     * A dependent tile must use a data stream
     * group where its data source tile is the "main tile".
     *
     * In case the group is not found, the method throws
     * an exception.
     *
     * @param subgroupId is the ID of the group
     */
    getSubgroup(subgroupId:string):DataStreaming {
        const curr = this.tilesDataStreams[subgroupId];
        if (!curr) {
            throw new Error(`DataStreaming subgroup ${subgroupId} does not exist.`);
        }
        return curr;
    }

    /**
     * This method produces a simple tag based on user query,
     * query type etc., which is used for easier
     * navigation in the persistent cache. I.e. it has no direct
     * use for WaG itself.
     */
    private mkQueryTag(userSession:UserConf):RequestTag {
        return {
            applicationId: userSession.applicationId,
            queries: userSession.queries,
            queryType: userSession.queryType,
            translatLang: userSession.translatLanguage
        };
    }

    private prepareTileRequest(entry:TileRequest):TileRequest {
        const updEntry = {...entry};
        if (entry.body && entry.url) {
            if (updEntry.method === HTTP.Method.GET) {
                const tmp = updEntry.url.split('?');
                const encArgs = encodeArgs(entry.body);
                updEntry.url = tmp.length === 1 ?
                    updEntry.url + '?' + encArgs :
                    updEntry.url + '&' + encArgs;
                updEntry.body = '';

            } else if (updEntry.contentType === 'application/json') {
                updEntry.body = JSON.stringify(updEntry.body);

            } else {
                updEntry.body = encodeArgs(entry.body);
            }

        } else if (!entry.url) {
            updEntry.body = '';
        }
        return updEntry;
    }


    registerTileRequest<T>(entry:TileRequest|OtherTileRequest):Observable<T> {
        if (!this.rootUrl) {
            return EMPTY;
        }
        const normEntry = normalizeRequest(entry);
        this.requestSubject.next(
            isOtherTileRequest(normEntry) ?
                normEntry :
                this.prepareTileRequest(normEntry)
        );
        return this.responseStream.pipe(
            filter(
                (response:EventItem<T>) => {
                    if (isOtherTileRequest(normEntry)) {
                        return response.tileId === normEntry.otherTileId && response.queryIdx === normEntry.otherTileQueryIdx;

                    } else {
                        return response.tileId === normEntry.tileId && response.queryIdx === normEntry.queryIdx;
                    }
                }
            ),
            map(response => {
                if (response.error) {
                    throw new Error(response.error);
                }
                return response.data as T;
            })
        );
    }

}

export class DataStreamingPreview implements IDataStreaming {

    private readonly mockData:{[key:string]:Array<any>};

    constructor(mockData:{[key:string]:Array<any>}) {
        this.mockData = mockData;
    }

    registerTileRequest<T>(entry:TileRequest|OtherTileRequest):Observable<T> {
        if (isOtherTileRequest(entry)) {
            return EMPTY;
        }
        // we assume that the fake preview api URLs are always absolute
        const splitUrl = entry.url.split('/');
        const tileId = splitUrl[1].endsWith('2') ? splitUrl[1].substring(0, entry.url.length - 1) : splitUrl[1];
        const tileData = this.mockData[tileId];
        const queryIdx = (entry.queryIdx !== undefined) && (tileData.length > entry.queryIdx) ? entry.queryIdx : 0;
        return rxOf(tileData[queryIdx] as T);
    }

    getId(): string {
        return "mock";
    }

    startNewSubgroup(mainTileId:number, ...dependentTiles:Array<number>):IDataStreaming {
        return this;
    }

    getSubgroup(subgroupId:string):IDataStreaming {
        return this;
    }
}