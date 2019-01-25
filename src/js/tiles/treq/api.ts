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
import {ajax$} from '../../shared/ajax';

/*
        multiw_flag = '1' if ' ' in lemma else '0'
        lemma_flag = '0' if ' ' in lemma else '1'
        groups = ','.join(groups)
        return [('left', lang1), ('right', lang2), ('viceslovne', multiw_flag), ('regularni', '0'),
                ('lemma', lemma_flag), ('aJeA', '1'), ('hledejKde', groups), ('hledejCo', lemma),
                ('order', 'percDesc')]
*/

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

export interface TreqTranslation {
    freq:number;
    perc:number;
    left:string;
    right:string;
}

export interface TreqResponse {
    sum:number;
    lines:Array<TreqTranslation>;
}

interface HTTPResponse {
    sum:number;
    lines:Array<{freq:string; perc:string; left:string; righ:string;}>;
}

export class TreqAPI implements DataApi<RequestArgs, TreqResponse> {

    private readonly apiURL;

    constructor(apiURL:string) {
        this.apiURL = apiURL;
    }

    call(args:RequestArgs):Rx.Observable<TreqResponse> {
        return ajax$<HTTPResponse>(
            'GET',
            this.apiURL,
            args

        ).concatMap(
            resp => Rx.Observable.of({
                sum: resp.sum,
                lines: resp.lines.map(v => ({
                    freq: parseInt(v.freq),
                    perc: parseFloat(v.perc),
                    left: v.left,
                    right: v.righ
                })).slice(0, 10)
            })
        );
    }
}