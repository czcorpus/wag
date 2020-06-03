/*
 * Copyright 2019 Tomas Machalek <tomas.machalek@gmail.com>
 * Copyright 2019 Martin Zimandl <martin.zimandl@gmail.com>
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

import { cachedAjax$, ResponseType } from '../../../page/ajax';
import { HTTPHeaders, IAsyncKeyValueStore } from '../../../types';
import { of as rxOf } from 'rxjs';
import { AjaxError } from 'rxjs/ajax';
import { IGeneralHtmlAPI } from '../../abstract/html';
import { IApiServices } from '../../../appServices';



export interface WiktionaryApiArgs {
    title:string;
    action:'render';
}


export class WiktionaryHtmlAPI implements IGeneralHtmlAPI<WiktionaryApiArgs>  {

    private readonly apiURL:string;

    private readonly customHeaders:HTTPHeaders;

    private readonly cache:IAsyncKeyValueStore;

    constructor(cache:IAsyncKeyValueStore, apiURL:string, apiServices:IApiServices) {
        this.apiURL = apiURL;
        this.customHeaders = apiServices.getApiHeaders(apiURL) || {};
        this.cache = cache;
    }

    stateToArgs(state:{}, query:string):WiktionaryApiArgs {
        return {
            title: query,
            action: 'render'
        }
    }

    supportsMultiWordQueries():boolean {
        return true;
    }

    private cleanData(input:string):string {
        return input.indexOf('čeština</span></h2>') > -1 ?
            input.split('čeština</span></h2>', 2)[1].split('<h2>', 1)[0] :
            input;
    }

    call(queryArgs:WiktionaryApiArgs):Observable<string|null> {
        return cachedAjax$<string>(this.cache)(
            'GET',
            this.apiURL,
            queryArgs,
            {headers: this.customHeaders, responseType: ResponseType.TEXT}

        ).pipe(
            catchError(
                (err) => {
                    if (err instanceof AjaxError && err.status === 404 && err.response.includes('noarticletext')) {
                        return rxOf(null);
                    }
                    throw err;
                }
            ),
            map(data => data !== null ? this.cleanData(data) : null)
        );
    }

}
