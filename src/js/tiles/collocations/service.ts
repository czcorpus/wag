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

import * as Rx from '@reactivex/rxjs';
import { DataApi } from '../../abstract/types';
import { ajax$ } from '../../shared/ajax';
import { CollApiArgs, DataRow, DataHeading } from './common';


export interface CollApiResponse {
    conc_persistence_op_id:string;
    Head:DataHeading;
    Items:Array<DataRow>;
}


export class KontextCollAPI implements DataApi<CollApiArgs, CollApiResponse> {

    private readonly apiURL:string;

    constructor(apiURL:string) {
        this.apiURL = apiURL;
    }


    call(queryArgs:CollApiArgs):Rx.Observable<CollApiResponse> {
        return ajax$(
            'GET',
            this.apiURL,
            queryArgs,
            {}
        );
    }

}

