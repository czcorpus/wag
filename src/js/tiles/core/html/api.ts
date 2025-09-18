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
import { catchError } from 'rxjs/operators';

import { ajax$, ResponseType } from '../../../page/ajax.js';
import { DataApi } from '../../../types.js';
import { of as rxOf } from 'rxjs';
import { AjaxError } from 'rxjs/ajax';
import { IApiServices } from '../../../appServices.js';
import { Backlink, BacklinkConf } from '../../../page/tile.js';
import { Dict } from 'cnc-tskit';
import { IDataStreaming } from '../../../page/streaming.js';


export type HtmlApiArgs = {[key:string]:string};

/**
 * This is a raw html loading api for WaG. !!! Please note that
 * this is intended to be used only with trusted services
 * as the returned code is injected into the tile (and thus
 * into the page) without any restriction which makes it
 * vulnerable from the external service!!!
 */

export class RawHtmlAPI implements DataApi<HtmlApiArgs, string|null> {

    private readonly apiURL:string;

    private readonly apiServices:IApiServices;

    private readonly backlinkConf:BacklinkConf;

    constructor(apiURL:string, apiServices:IApiServices, backlinkConf:BacklinkConf) {
        this.apiURL = apiURL;
        this.apiServices = apiServices;
        this.backlinkConf = backlinkConf;
    }

    stateToArgs(state:{lemmaArg:string, args:{[key:string]:string}}, query:string):HtmlApiArgs {
        const args = {...state.args};
        if (state.lemmaArg) {
            args[state.lemmaArg] = query;
        }
        return args;
    }

    supportsMultiWordQueries():boolean {
        return true;
    }

    call(streaming:IDataStreaming, tileId:number, queryIdx:number, queryArgs:HtmlApiArgs):Observable<string|null> {
        return ajax$<string>(
            'GET',
            this.apiURL,
            queryArgs,
            {
                headers: this.apiServices.getApiHeaders(this.apiURL),
                withCredentials: true,
                responseType: ResponseType.TEXT
            }

        ).pipe(
            catchError(
                (err) => {
                    if (err instanceof AjaxError && err.status === 404) {
                        return rxOf(null);
                    }
                    throw err;
                }
            )
        );
    }

    getBacklink(queryId:number, subqueryId?:number):Backlink|null {
        return this.backlinkConf ? {
            queryId,
            subqueryId,
            label: this.backlinkConf.label || 'Page',
        } :
        null;
    }

    requestBacklink(args:HtmlApiArgs):URL {
        const url = new URL(this.backlinkConf.url);
        Dict.forEach(
            (value, key) => {
                url.searchParams.set(key, value);
            },
            args,
        );
        return url;
    }
}


