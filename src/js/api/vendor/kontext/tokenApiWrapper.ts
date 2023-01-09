/*
 * Copyright 2022 Tomas Machalek <tomas.machalek@gmail.com>
 * Copyright 2022 Martin Zimandl <martin.zimandl@gmail.com>
 * Copyright 2022 Institute of the Czech National Corpus,
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
import { throwError } from 'rxjs';
import { catchError, concatMap, tap } from 'rxjs/operators';
import { HTTP } from 'cnc-tskit';

import { ajax$ } from '../../../page/ajax';
import { IApiServices } from '../../../appServices';
import { DataApi } from '../../../types';


export class TokenApiWrapper<T, U, V extends DataApi<T, U>> {

    private readonly apiServices:IApiServices;

    private readonly apiURL:string;

    private readonly authenticateURL:string;

    constructor(apiServices:IApiServices, apiURL:string, authenticateURL:string) {
        this.apiServices = apiServices;
        this.apiURL = apiURL;
        this.authenticateURL = authenticateURL;
    }

    authenticate() {
        return ajax$<{x_api_key: string}>(
            HTTP.Method.POST,
            this.authenticateURL,
            {},
        ).pipe(
            tap(({x_api_key}) => {
                this.apiServices.setApiKeyHeader(this.apiURL, 'X-Api-Key', x_api_key);
            }),
        );
    }

    get(target:V, prop:string, receiver) {
        if (prop === 'call') {
            return (args:T) => {
                return target.call(args).pipe(
                    catchError((err, _) => {
                        if (err.status === HTTP.Status.Forbidden || err.status === HTTP.Status.Unauthorized) {
                            return this.authenticate().pipe(
                                concatMap(_ => target.call(args))
                            );
                        } else {
                            throwError(() => err);
                        }
                    })
                )
            }
        } else {
            return target[prop];
        }
    }

}
