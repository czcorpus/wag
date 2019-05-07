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
import { map } from 'rxjs/operators';

import { DataApi, HTTPMethod } from '../../types';
import { ajax$ } from '../../ajax';
import { LemmaVariant } from '../../query';
import { RequestArgs, Response } from '../../api/abstract/wordForms';


export interface HTTPResponse {
    result:Array<LemmaVariant>;
}


export class WordFormsWdglanceAPI implements DataApi<RequestArgs, Response> {

    url:string;

    constructor(url:string) {
        this.url = url;
    }

    call(args:RequestArgs):Observable<Response> {
        return ajax$<HTTPResponse>(
            HTTPMethod.GET,
            this.url,
            args

        ).pipe(
            map(
                (item) => {
                    const total = item.result.reduce((acc, curr) => curr.abs + acc, 0);
                    return {
                        forms: item.result.map(v => ({
                            value: v.word,
                            freq: v.abs,
                            ratio: v.abs / total
                        }))
                    };
                }
            )
        );
    }

}