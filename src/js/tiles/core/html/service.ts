/*
 * Copyright 2019 Tomas Machalek <tomas.machalek@gmail.com>
 * Copyright 2019 Institute of the Czech National Corpus,
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
import { map, catchError } from 'rxjs/operators';

import { cachedAjax$, ResponseType } from '../../../common/ajax';
import { DataApi, HTTPHeaders, IAsyncKeyValueStore } from '../../../common/types';
import { HtmlApiArgs, WiktionaryApiArgs, HtmlModelState } from './common';
import { AppServices } from '../../../appServices';
import { of as rxOf } from 'rxjs';
import { AjaxError } from 'rxjs/ajax';


export interface GeneralHtmlAPI<T> extends DataApi<T, string> {
    stateToArgs(state:HtmlModelState, query:string):T;
}


export class RawHtmlAPI implements GeneralHtmlAPI<HtmlApiArgs> {

    private readonly apiURL:string;

    private readonly customHeaders:HTTPHeaders;

    private readonly cache:IAsyncKeyValueStore;

    private readonly appServices:AppServices;

    constructor(cache:IAsyncKeyValueStore, apiURL:string, appServices:AppServices, customHeaders?:HTTPHeaders) {
        this.apiURL = apiURL;
        this.appServices = appServices;
        this.customHeaders = customHeaders || {};
        this.cache = cache;
    }

    stateToArgs(state:HtmlModelState, query:string):HtmlApiArgs {
        const args = {...state.args};
        if (state.lemmaArg) {
            args[state.lemmaArg] = query;
        }
        return args;
    }

    call(queryArgs:HtmlApiArgs):Observable<string> {
        return cachedAjax$<string>(this.cache)(
            'GET',
            this.apiURL,
            queryArgs,
            {headers: this.customHeaders, responseType: ResponseType.TEXT}

        ).pipe(
            catchError(
                (err) => {
                    if (err instanceof AjaxError && err.status === 404) {
                        return rxOf(this.appServices.translate('html__entry_not_found_message'));
                    }
                    throw err;
                }
            )
        );
    }

}


export class WiktionaryHtmlAPI implements GeneralHtmlAPI<WiktionaryApiArgs>  {

    private readonly apiURL:string;

    private readonly customHeaders:HTTPHeaders;

    private readonly cache:IAsyncKeyValueStore;

    private readonly appServices:AppServices;

    constructor(cache:IAsyncKeyValueStore, apiURL:string, appServices:AppServices, customHeaders?:HTTPHeaders) {
        this.apiURL = apiURL;
        this.customHeaders = customHeaders || {};
        this.cache = cache;
        this.appServices = appServices;
    }

    stateToArgs(state:HtmlModelState, query:string):WiktionaryApiArgs {
        return {
            title: query,
            action: 'render'
        }
    }

    call(queryArgs:WiktionaryApiArgs):Observable<string> {
        return cachedAjax$<string>(this.cache)(
            'GET',
            this.apiURL,
            queryArgs,
            {headers: this.customHeaders, responseType: ResponseType.TEXT}

        ).pipe(
            catchError(
                (err) => {
                    if (err instanceof AjaxError && err.status === 404 && err.response.includes('noarticletext')) {
                        return rxOf(this.appServices.translate('html__entry_not_found_message'));
                    }
                    throw err;
                }
            ),
            map(data =>
                data.indexOf('čeština</span></h2>') > -1 ?
                    data.split('čeština</span></h2>', 2)[1].split('<h2>', 1)[0] :
                    data
            )
        );
    }

}
