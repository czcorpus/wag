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

import { QueryType } from '../../../query/index.js';
import { DataApi, SourceDetails } from '../../../types.js';
import { Observable } from 'rxjs';
import { ajax$ } from '../../../page/ajax.js';
import { map } from 'rxjs/operators';
import { HTTPAction } from '../../../server/routes/actions.js';
import { IApiServices } from '../../../appServices.js';


export interface FreqDbSourceInfoArgs {
    tileId:number;
    queryType:QueryType;
    domain:string;
    corpname:string;
}

export class InternalResourceInfoApi implements DataApi<FreqDbSourceInfoArgs, SourceDetails> {

    private readonly apiURL:string;

    private readonly apiServices:IApiServices;

    constructor(apiURL:string, apiServices:IApiServices) {
        this.apiURL = apiURL;
        this.apiServices = apiServices;
    }

    call(args:FreqDbSourceInfoArgs):Observable<SourceDetails> {
        return ajax$<{result:SourceDetails}>(
            'GET',
            this.apiURL + HTTPAction.SOURCE_INFO,
            args,
            {
                headers: this.apiServices.getApiHeaders(this.apiURL),
                withCredentials: true
            }

        ).pipe(
            map(
                resp => ({...resp.result, tileId: args.tileId})
            )
        )
    };
}