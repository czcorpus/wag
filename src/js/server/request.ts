/*
 * Copyright 2020 Tomas Machalek <tomas.machalek@gmail.com>
 * Copyright 2020 Institute of the Czech National Corpus,
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
import { Dict, HTTP, List, pipe } from 'cnc-tskit';
import axios, { Method, AxiosError, AxiosResponse } from 'axios';

/**
 *
 */
export interface ServerHTTPRequestConf { // TODO make this parametrizable to prevent 'any' below
    url:string;
    method:HTTP.Method;
    params?:{[k:string]:string|number|boolean};
    data?:{[k:string]:string|number|boolean|any};
    auth?:{username:string, password: string};
    headers?:{[k:string]:string};
    cookies?:{[k:string]:string};
}

export class ServerHTTPRequestError extends Error {

    readonly message:string;

    readonly status:HTTP.Status;

    readonly statusText:string;

    constructor(status:HTTP.Status, statusText:string, message?:string) {
        super(message);
        this.status = status;
        this.statusText = statusText;
        this.message = message ?? statusText;
    }
}

function upgradeHeadersWithCookies(headers:any, cookies:{[k:string]:string}):{[k:string]:string} {
    if (!headers) {
        headers = {};
    }
    const rawCookies = pipe(
        cookies,
        Dict.toEntries(),
        List.map(([k, v]) => `${k}=${v};`),
        x => x.join(' ')
    );
    headers['Cookie'] = headers['Cookie'] ?
        headers['Cookie'] + ' ' + rawCookies :
        rawCookies;
    return headers;
}

export function serverHttpRequest<T>({
    url,
    method,
    params,
    data,
    auth,
    headers,
    cookies
}:ServerHTTPRequestConf):Observable<T> {

    return new Observable<T>((observer) => {
        const client = axios.create();
        client.request<T>({
            method: method as Method, // here we assume that HTTP.Method is a subset of Method
            url,
            params,
            data,
            auth,
            headers: upgradeHeadersWithCookies(headers, cookies)

        }).then(
            (resp) => {
                observer.next(resp.data);
                observer.complete();
            },
            (err:AxiosError) => {
                observer.error(new ServerHTTPRequestError(
                    err.response ? err.response.status : -1,
                    err.response ? err.response.statusText : '-',
                    `Request failed: ${err.message}`,
                ));
            }
        );
    });
}

// return full response including headers, not only data
export function fullServerHttpRequest<T>({
    url,
    method,
    params,
    data,
    auth,
    headers,
    cookies
}:ServerHTTPRequestConf):Observable<AxiosResponse<T>> {
    return new Observable<AxiosResponse<T>>((observer) => {
        const client = axios.create();
        client.request<T>({
            method: method as Method, // here we assume that HTTP.Method is a subset of Method
            url,
            params,
            data,
            auth,
            headers: upgradeHeadersWithCookies(headers, cookies)

        }).then(
            (resp) => {
                observer.next(resp);
                observer.complete();
            },
            (err:AxiosError) => {
                observer.error(new ServerHTTPRequestError(
                    err.response ? err.response.status : -1,
                    err.response ? err.response.statusText : '-',
                    `Request failed: ${err.message}`,
                ));
            }
        );
    });
}