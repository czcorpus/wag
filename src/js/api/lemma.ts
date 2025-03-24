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
import { DataApi } from '../types.js';
import { HTTP } from 'cnc-tskit';
import { QueryMatch } from '../query/index.js';
import { ajax$ } from '../page/ajax.js';
import { MainPosAttrValues } from '../conf/index.js';


interface LemmaDbRequestArgs {
    domain:string;
    q:string;
    mainPosAttr:MainPosAttrValues;
}


export interface LemmaDbResponse {
    result:Array<QueryMatch>;
}

/**
 * Represents a service able to provide a lemmatized variant
 * of a provided query
 */
export class LemmaDbApi implements DataApi<LemmaDbRequestArgs, LemmaDbResponse> {

    private readonly url:string;

    constructor(url:string) {
        this.url = url;
    }

    call(tileId:number, multicastRequest:boolean, args:LemmaDbRequestArgs):Observable<LemmaDbResponse> {
        return ajax$<LemmaDbResponse>(
            HTTP.Method.GET,
            this.url,
            args
        );
    }
}