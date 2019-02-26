/*
 * Copyright 2018 Tomas Machalek <tomas.machalek@gmail.com>
 * Copyright 2018 Institute of the Czech National Corpus,
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

import {Observable} from 'rxjs/Observable';
import {AjaxResponse} from 'rxjs/observable/dom/AjaxObservable';
import {ajax} from 'rxjs/observable/dom/ajax';
import {map} from 'rxjs/operators/map';
import { MultiDict } from './data';


export enum ResponseType {
    ARRAY_BUFFER = "arraybuffer",
    BLOB = "blob",
    DOCUMENT = "document",
    JSON = "json",
    TEXT = "text"
}


export interface AjaxOptions {
    contentType?:string;
    responseType?:ResponseType;
    accept?:string;
}

interface AjaxRequestProps {
    accept:string,
    contentType:string,
    responseType:string,
    method:string,
    requestBody:string,
    url:string
}

export type AjaxArgs = MultiDict|{[key:string]:any}|string;


const exportValue = (v) => v === null || v === undefined ? '' : encodeURIComponent(v);


export const encodeArgs = (obj):string => {
    const ans = [];
    let p; // ES5 issue
    for (p in obj) {
        if (obj.hasOwnProperty(p)) {
            const val = obj[p] !== null && obj[p] !== undefined ? obj[p] : '';
            if (Object.prototype.toString.apply(val) === '[object Array]') {
                val.forEach(item => {
                    ans.push(encodeURIComponent(p) + '=' + exportValue(item));
                });

            } else {
                ans.push(encodeURIComponent(p) + '=' + exportValue(val));
            }
        }
    }
    return ans.join('&');
};

const encodeURLParameters = (params:MultiDict):string => {
    function exportValue(v) {
        return v === null || v === undefined ? '' : encodeURIComponent(v);
    }
    return params.items().map((item) => {
        return encodeURIComponent(item[0]) + '=' + exportValue(item[1]);
    }).join('&');
};

const prepareAjax = (method:string, url:string, args:AjaxArgs, options?:AjaxOptions):AjaxRequestProps => {
    if (options === undefined) {
        options = {};
    }
    if (!options.accept) {
        options.accept = 'application/json';
    }
    if (!options.contentType) {
        options.contentType = 'application/x-www-form-urlencoded; charset=UTF-8';
    }
    if (!options.responseType) {
        options.responseType = ResponseType.JSON;
    }

    let body;

    if (args instanceof MultiDict) {
        body = encodeURLParameters(args);

    } else if (typeof args === 'object') {
        if (options.contentType === 'application/json') {
            body = JSON.stringify(args);

        } else {
            body = encodeArgs(args);
        }

    } else if (typeof args === 'string') {
        body = args;

    } else {
        throw new Error('ajax() error: unsupported args type ' + (typeof args));
    }

    if (method === 'GET') {
        let elms = url.split('?');
        if (!elms[1]) {
            url += '?' + body;

        } else {
            url += '&' + body;
        }
    }

    return {
        accept: options.accept,
        contentType: options.contentType,
        responseType: options.responseType,
        method: method,
        requestBody: body,
        url: url
    }
};


export const ajax$ = <T>(method:string, url:string, args:AjaxArgs, options?:AjaxOptions):Observable<T> => {
    const callArgs = prepareAjax(method, url, args, options);
    return ajax({
        url: callArgs.url,
        body: callArgs.requestBody,
        method: callArgs.method,
        responseType: callArgs.responseType,
        headers: {
            'Content-Type': callArgs.contentType
        }
    }).pipe(map<AjaxResponse, T>(v => v.response));
}
