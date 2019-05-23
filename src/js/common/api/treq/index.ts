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
    rightLc:string;
    right:Array<string>;
    interactionId:string;
    color?:string;
}

export interface TreqResponse {
    sum:number;
    lines:Array<TreqTranslation>;
}

interface HTTPResponseLine {
    freq:string;
    perc:string;
    left:string;
    righ:string;
}

interface HTTPResponse {
    sum:number;
    lines:Array<HTTPResponseLine>;
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


    private mergeByLowercase(lines:Array<TreqTranslation>):Array<TreqTranslation> {
        return Object.values<TreqTranslation>(lines.reduce(
            (acc, curr) => {
                if (!(curr.rightLc in acc)) {
                    acc[curr.rightLc] = {
                        freq: curr.freq,
                        perc: curr.perc,
                        left: curr.left,
                        right: curr.right,
                        rightLc: curr.rightLc,
                        interactionId: mkInterctionId(curr.rightLc)
                    };

                } else {
                    acc[curr.rightLc].freq += curr.freq;
                    acc[curr.rightLc].perc += curr.perc;
                    curr.right.forEach(variant => {
                        if (acc[curr.rightLc].right.indexOf(variant) === -1) {
                            acc[curr.rightLc].right.push(variant);
                        }
                    });
                }
                return acc;
            },
            {}
        )).sort((x1, x2) => x2.perc - x1.perc);
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
                    lines: this.mergeByLowercase(resp.lines.map(v => ({
                        freq: parseInt(v.freq),
                        perc: parseFloat(v.perc),
                        left: v.left,
                        rightLc: v.righ.toLowerCase(),
                        right: [v.righ],
                        interactionId: ''
                    }))).slice(0, 10)
                })
            )
        );
    }
}