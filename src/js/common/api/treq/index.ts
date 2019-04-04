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

import { ajax$ } from '../../ajax';
import { DataApi } from '../../types';
import { puid } from '../../util';


/*
        multiw_flag = '1' if ' ' in lemma else '0'
        lemma_flag = '0' if ' ' in lemma else '1'
        groups = ','.join(groups)
        return [('left', lang1), ('right', lang2), ('viceslovne', multiw_flag), ('regularni', '0'),
                ('lemma', lemma_flag), ('aJeA', '1'), ('hledejKde', groups), ('hledejCo', lemma),
                ('order', 'percDesc')]


    def mk_page_args(lang1, lang2, groups, lemma):
        multiw_flag = '1' if ' ' in lemma else '0'
        lemma_flag = '0' if ' ' in lemma else '1'
        return [('jazyk1', lang1), ('jazyk2', lang2), ('viceslovne', multiw_flag), ('regularni', '0'),
                ('lemma', lemma_flag), ('caseInsen', '1'), ('hledejCo', lemma)] + [('hledejKde[]', g) for g in groups]
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

    private readonly apiURL;

    constructor(apiURL:string) {
        this.apiURL = apiURL;
    }

    call2(args:RequestArgs):Observable<TreqResponse> {
        const rawLines = [{"freq":"462","perc":"51.1","left":"posun","righ":"shift"},{"freq":"178","perc":"19.7","left":"posun","righ":"move"},{"freq":"52","perc":"5.8","left":"posun","righ":"progress"},{"freq":"36","perc":"4.0","left":"posun","righ":"movement"},{"freq":"28","perc":"3.1","left":"posun","righ":"step"},{"freq":"13","perc":"1.4","left":"posun","righ":"advance"},{"freq":"12","perc":"1.3","left":"posun","righ":"lag"},{"freq":"10","perc":"1.1","left":"posun","righ":"development"},{"freq":"7","perc":"0.8","left":"posun","righ":"difference"},{"freq":"6","perc":"0.7","left":"posun","righ":"forward"},{"freq":"5","perc":"0.6","left":"posun","righ":"push"},{"freq":"5","perc":"0.6","left":"posun","righ":"drive"},{"freq":"5","perc":"0.6","left":"posun","righ":"drift"},{"freq":"5","perc":"0.6","left":"posun","righ":"breakthrough"},{"freq":"5","perc":"0.6","left":"posun","righ":"transition"},{"freq":"5","perc":"0.6","left":"posun","righ":"leap"},{"freq":"3","perc":"0.3","left":"posun","righ":"momentum"},{"freq":"3","perc":"0.3","left":"posun","righ":"warp"},{"freq":"3","perc":"0.3","left":"posun","righ":"switch"},{"freq":"2","perc":"0.2","left":"posun","righ":"stride"},{"freq":"2","perc":"0.2","left":"posun","righ":"proceed"},{"freq":"2","perc":"0.2","left":"posun","righ":"bring"},{"freq":"2","perc":"0.2","left":"posun","righ":"jetlag"},{"freq":"2","perc":"0.2","left":"posun","righ":"change"},{"freq":"2","perc":"0.2","left":"posun","righ":"adjustment"},{"freq":"2","perc":"0.2","left":"posun","righ":"transfer"},{"freq":"2","perc":"0.2","left":"posun","righ":"result"},{"freq":"2","perc":"0.2","left":"posun","righ":"direction"},{"freq":"2","perc":"0.2","left":"posun","righ":"advancement"},{"freq":"2","perc":"0.2","left":"posun","righ":"substantive"},{"freq":"1","perc":"0.1","left":"posun","righ":"tilt"},{"freq":"1","perc":"0.1","left":"posun","righ":"Shifts"},{"freq":"1","perc":"0.1","left":"posun","righ":"inroad"},{"freq":"1","perc":"0.1","left":"posun","righ":"away"},{"freq":"1","perc":"0.1","left":"posun","righ":"occur"},{"freq":"1","perc":"0.1","left":"posun","righ":"flex"},{"freq":"1","perc":"0.1","left":"posun","righ":"differential"},{"freq":"1","perc":"0.1","left":"posun","righ":"popularly"},{"freq":"1","perc":"0.1","left":"posun","righ":"link"},{"freq":"1","perc":"0.1","left":"posun","righ":"improvement"},{"freq":"1","perc":"0.1","left":"posun","righ":"departure"},{"freq":"1","perc":"0.1","left":"posun","righ":"pub"},{"freq":"1","perc":"0.1","left":"posun","righ":"then"},{"freq":"1","perc":"0.1","left":"posun","righ":"shuffle"},{"freq":"1","perc":"0.1","left":"posun","righ":"shall"},{"freq":"1","perc":"0.1","left":"posun","righ":"Saudi"},{"freq":"1","perc":"0.1","left":"posun","righ":"over"},{"freq":"1","perc":"0.1","left":"posun","righ":"Iag"},{"freq":"1","perc":"0.1","left":"posun","righ":"flux"},{"freq":"1","perc":"0.1","left":"posun","righ":"displacement"},{"freq":"1","perc":"0.1","left":"posun","righ":"road"},{"freq":"1","perc":"0.1","left":"posun","righ":"evolution"},{"freq":"1","perc":"0.1","left":"posun","righ":"draw"},{"freq":"1","perc":"0.1","left":"posun","righ":"that"},{"freq":"1","perc":"0.1","left":"posun","righ":"jiggle"},{"freq":"1","perc":"0.1","left":"posun","righ":"dislocation"},{"freq":"1","perc":"0.1","left":"posun","righ":"longer"},{"freq":"1","perc":"0.1","left":"posun","righ":"landslide"},{"freq":"1","perc":"0.1","left":"posun","righ":"headway"},{"freq":"1","perc":"0.1","left":"posun","righ":"substantial"},{"freq":"1","perc":"0.1","left":"posun","righ":"bipartisan"},{"freq":"1","perc":"0.1","left":"posun","righ":"timeshifts"},{"freq":"1","perc":"0.1","left":"posun","righ":"slide"},{"freq":"1","perc":"0.1","left":"posun","righ":"shove"},{"freq":"1","perc":"0.1","left":"posun","righ":"scoot"},{"freq":"1","perc":"0.1","left":"posun","righ":"progression"},{"freq":"1","perc":"0.1","left":"posun","righ":"international"},{"freq":"1","perc":"0.1","left":"posun","righ":"church"},{"freq":"1","perc":"0.1","left":"posun","righ":"endogenous"}];
        return rxOf({
            sum: 904,
            lines: rawLines.map(v => ({
                        freq: parseInt(v.freq),
                        perc: parseFloat(v.perc),
                        left: v.left,
                        right: v.righ,
                        interactionId: mkInterctionId(v.righ)
                       }))
        })
    }

    call(args:RequestArgs):Observable<TreqResponse> {
        return ajax$<HTTPResponse>(
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