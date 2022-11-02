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
import { Observable, throwError } from 'rxjs';
import { catchError, concatMap, tap } from 'rxjs/operators';
import { HTTP } from 'cnc-tskit';

import { ajax$ } from '../../../../../page/ajax';
import { IAsyncKeyValueStore } from '../../../../../types';
import { ConcResponse } from '../../../../abstract/concordance';
import { IApiServices } from '../../../../../appServices';
import { ConcQueryArgs, ConcViewArgs, FilterServerArgs, QuickFilterRequestArgs } from '../../types';
import { ConcApi } from '../v015/index';



export class ConcTokenApi extends ConcApi {

    private readonly authenticateURL:string;

    constructor(cache:IAsyncKeyValueStore, apiURL:string, apiServices:IApiServices, authenticateURL:string) {
        super(cache, apiURL, apiServices);
        this.authenticateURL = authenticateURL;
    }

    getHeaders() {
        return {
            ...super.getHeaders(),
            "X-Api-Key": sessionStorage.getItem("kontextApiKey"),
        }
    }

    authenticate() {
        return ajax$<{x_api_key: string}>(
            HTTP.Method.POST,
            this.authenticateURL,
            {},
        ).pipe(
            tap(({x_api_key}) => {
                sessionStorage.setItem("kontextApiKey", x_api_key);
            }),
        );
    }

    call(args:ConcQueryArgs|ConcViewArgs|FilterServerArgs|QuickFilterRequestArgs):Observable<ConcResponse> {
        return super.call(args).pipe(
            catchError((err, _) => {
                if (err.status === HTTP.Status.Forbidden) {
                    return this.authenticate().pipe(
                        concatMap(_ => super.call(args))
                    );
                } else {
                    throwError(() => err);
                }
            })
        )
    }
}