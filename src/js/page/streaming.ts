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

import { HTTP, List, pipe, tuple } from 'cnc-tskit';
import { EMPTY, Observable, Subject, of as rxOf } from 'rxjs';
import { concatMap, filter, first, map, scan, share, tap, timeout } from 'rxjs/operators';
import { ajax$, encodeArgs } from './ajax.js';
import urlJoin from 'url-join';


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

interface EventItem<T = unknown> {
    tileId:number;
    data:T;
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
export class DataStreaming {

    private readonly requestSubject:Subject<TileRequest>;

    private readonly responseStream:Observable<EventItem>;

    private readonly rootUrl:string|undefined;

    constructor(tileIds:Array<string|number>, rootUrl:string|undefined) {
        this.rootUrl = rootUrl;
        this.requestSubject = new Subject<TileRequest>();
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
                        List.map<number|string, [number, TileRequest|undefined]>(
                            v => tuple(typeof(v) === 'string' ? parseInt(v) : v, undefined),
                        )
                    )
                )
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
            timeout(30000),
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
                        )
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
                                    console.log(evt.data);
                                    
                                    if (val.contentType == 'application/json') {
                                        observer.next({
                                            data: JSON.parse(evt.data),
                                            tileId: val.tileId
                                        });

                                    } else if (val.base64EncodeResult && typeof evt.data === 'string') {
                                        const tmp = atob(evt.data);
                                        observer.next({
                                            data: tmp,
                                            tileId: val.tileId
                                        })

                                    } else {
                                        observer.next({
                                            data: val.contentType == 'application/json' ?
                                                JSON.parse(evt.data) : evt.data,
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
        this.responseStream.subscribe({
            error: error => {
                console.log('response stream error: ', error)
            }
        });
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


    registerTileRequest<T>(multicastRequest:boolean, entry:TileRequest):Observable<T> {
        if (!this.rootUrl) {
            console.error('trying to register tile for data stream but there is no URL set, this is likely a config error')
            return EMPTY;
        }
        if (multicastRequest) {
            this.requestSubject.next(this.prepareTileRequest(entry));
            return this.responseStream.pipe(
                filter((response:EventItem<T>) => response.tileId === entry.tileId),
                map(response => response.data as T)
            );

        } else {
            return this.registerExclusiveTileRequest(entry);
        }
    }

    private registerExclusiveTileRequest<T>(entry:TileRequest):Observable<T> {
        const responseStream = rxOf(this.prepareTileRequest(entry)).pipe(
            concatMap(
                entry => ajax$<{id:string}>(
                    HTTP.Method.PUT,
                    this.rootUrl,
                    {
                        requests: [entry]
                    },
                    {
                        contentType: 'application/json'
                    }
                ).pipe(
                    map(
                        resp => tuple(entry, resp)
                    )
                )
            ),
            concatMap(
                ([reqEntry, resp]) => new Observable<EventItem>(
                    observer => {
                        const evtSrc = new EventSource(
                            urlJoin(this.rootUrl, resp.id)
                        );
                        evtSrc.addEventListener(`DataTile-${reqEntry.tileId}`, evt => {
                            if (reqEntry.contentType == 'application/json') {
                                observer.next({
                                    data: JSON.parse(evt.data),
                                    tileId: reqEntry.tileId
                                });

                            } else if (reqEntry.base64EncodeResult && typeof evt.data === 'string') {
                                const tmp = atob(evt.data);
                                observer.next({
                                    data: tmp,
                                    tileId: reqEntry.tileId
                                })

                            } else {
                                observer.next({
                                    data: reqEntry.contentType == 'application/json' ?
                                        JSON.parse(evt.data) : evt.data,
                                    tileId: reqEntry.tileId
                                })
                            }
                        });
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
            map(response => response.data as T),
            share()
        );
        responseStream.subscribe({
            error: error => {
                console.log('response stream error: ', error)
            }
        });
        return responseStream;
    }
}