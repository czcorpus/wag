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
import { Observable, of as rxOf } from 'rxjs';
import { map } from 'rxjs/operators';

import { cachedAjax$ } from '../../ajax';
import { DataApi, IAsyncKeyValueStore } from '../../types';


export type SearchPackages = {[lang2:string]:Array<string>};

export interface RequestArgs {
    left:string;
    right:string;
    viceslovne:string;
    regularni:string;
    lemma:string;
    aJeA:string;
    hledejKde:string;
    hledejCo:string;
    order:string;
    api:'true';
}


export interface PageArgs {
    jazyk1:string;
    jazyk2:string;
    viceslovne:string;
    regularni:string;
    lemma:string;
    caseInsen:string;
    hledejCo:string;
    'hledejKde[]':Array<string>;
}


export interface TreqTranslation {
    freq:number;
    perc:number;
    left:string;
    right:string;
    interactionId:string;
    color?:string;
}

export interface TreqResponse {
    sum:number;
    lines:Array<TreqTranslation>;
}

interface HTTPResponse {
    sum:number;
    lines:Array<{freq:string; perc:string; left:string; righ:string;}>;
}

export const mkInterctionId = (word:string):string => {
    return `treqInteractionKey:${word}`;
};

export class TreqAPI implements DataApi<RequestArgs, TreqResponse> {

    private readonly cache:IAsyncKeyValueStore;

    private readonly apiURL:string;

    constructor(cache:IAsyncKeyValueStore, apiURL:string) {
        this.cache = cache;
        this.apiURL = apiURL;
    }

    call(args:RequestArgs):Observable<TreqResponse> {
        return cachedAjax$<HTTPResponse>(this.cache)(
            'GET',
            this.apiURL,
            args

        ).pipe(
            map(
                resp => ({
                    sum: resp.sum,
                    lines: resp.lines.map(v => ({
                        freq: parseInt(v.freq),
                        perc: parseFloat(v.perc),
                        left: v.left,
                        right: v.righ,
                        interactionId: mkInterctionId(v.righ)
                    })).slice(0, 10)
                })
            )
        );
    }
}