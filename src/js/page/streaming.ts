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
import { EMPTY, Observable, Subject, of as rxOf } from 'rxjs';
import { concatMap, filter, first, map, scan, share, tap, timeout } from 'rxjs/operators';
import { ajax$, encodeArgs } from './ajax.js';
import urlJoin from 'url-join';
import { UserConf, UserQuery } from '../conf/index.js';
import { QueryType } from '../query/index.js';


interface TileRequest {
    tileId:number;
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

interface OtherTileRequest {
    tileId:number;
    otherTileId:number;
    contentType:string;
    base64EncodeResult?:boolean;
}

function isOtherTileRequest(t:TileRequest|OtherTileRequest):t is OtherTileRequest {
    return typeof t['otherTileId'] === 'number';
}

interface EventItem<T = unknown> {
    tileId:number;
    data:T;
    error?:string;
}

interface RequestTag {
    queries:Array<UserQuery>;
    queryType:QueryType;
    query1Domain:string;
    query2Domain:string;
}

export interface IDataStreaming {
    registerTileRequest<T>(entry:TileRequest|OtherTileRequest):Observable<T>
}

export class EmptyDataStreaming implements IDataStreaming {

    registerTileRequest<T>(entry:TileRequest|OtherTileRequest):Observable<T> {
        return EMPTY;
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

    private readonly userSession:UserConf;

    private readonly tilesDataStreams:{[streamId:string]:DataStreaming};

    private readonly id:string;

    static readonly ID_GLOBAL = '__global__';

    constructor(
        id:string|null,
        tileIds:Array<string|number>,
        rootUrl:string|null,
        tilesReadyTimeoutSecs:number,
        userSession:UserConf
    ) {
        this.id = id ? id : DataStreaming.ID_GLOBAL;
        this.rootUrl = rootUrl;
        this.tilesReadyTimeoutSecs = tilesReadyTimeoutSecs;
        this.reqTag = userSession ? this.mkQueryTag(userSession) : undefined;
        this.userSession = userSession;
        this.tilesDataStreams = {};
        this.requestSubject = new Subject<TileRequest|OtherTileRequest>();
        this.responseStream = this.requestSubject.pipe(
            scan(
                (acc, value) => {
                    if (acc.get(value.tileId) === undefined) {
                        acc.set(value.tileId, value);
                    }
                    return acc;
                },
                new Map(
                    pipe(
                        tileIds,
                        List.map<number|string, [number, TileRequest|OtherTileRequest|undefined]>(
                            v => tuple(typeof(v) === 'string' ? parseInt(v) : v, undefined),
                        )
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
                                evtSrc.addEventListener(`DataTile-${val.tileId}`, evt => {
                                    if (val.contentType == 'application/json') {
                                        try {
                                            const tmp = JSON.parse(evt.data);
                                            observer.next({
                                                data: tmp,
                                                error: !!tmp && tmp.hasOwnProperty('error') ? tmp.error : undefined,
                                                tileId: val.tileId
                                            });

                                        } catch (e) {
                                            observer.error(new Error(`Failed to process response for tile ${val.tileId}: ${e}`));
                                        }

                                    } else if (val.base64EncodeResult && typeof evt.data === 'string') {
                                        const tmp = atob(evt.data);
                                        observer.next({
                                            data: tmp,
                                            tileId: val.tileId
                                        })

                                    } else {
                                        observer.next({
                                            data: evt.data,
                                            tileId: val.tileId
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
        );
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
     * group of tiles. This is intended for tiles which
     * have other dependent tiles and need to update
     * data together.
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
            this.userSession
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
     * search domains, query type etc., which is used for easier
     * navigation in the persistent cache. I.e. it has no direct
     * use for WaG itself.
     */
    private mkQueryTag(userSession:UserConf):RequestTag {
        return {
            queries: userSession.queries,
            queryType: userSession.queryType,
            query1Domain: userSession.query1Domain,
            query2Domain: userSession.query2Domain
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

        this.requestSubject.next(isOtherTileRequest(entry) ? entry : this.prepareTileRequest(entry));
        return this.responseStream.pipe(
            filter((response:EventItem<T>) => response.tileId === entry.tileId),
            map(response => {
                if (response.error) {
                    throw new Error(response.error);
                }
                return response.data as T;
            })
        );
    }

}