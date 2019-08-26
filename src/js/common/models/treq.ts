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
import * as Immutable from 'immutable';
import { RequestArgs, PageArgs } from '../api/treq';


export interface TreqModelMinState {
    lang1:string;
    lang2:string;
    minItemFreq:number;
}


export const stateToAPIArgs = (state:TreqModelMinState, query:string, packages:Immutable.List<string>):RequestArgs => {
    return {
        left: state.lang1,
        right: state.lang2,
        viceslovne: '0',
        regularni: '0',
        lemma: '1',
        aJeA: '1',
        hledejKde: packages.join(','),
        hledejCo: query,
        order: 'percDesc',
        api: 'true'
    };
};


export const stateToPageArgs = (state:TreqModelMinState, query:string, packages:Immutable.List<string>):PageArgs => {
    return {
        jazyk1: state.lang1,
        jazyk2: state.lang2,
        viceslovne: '0',
        regularni: '0',
        lemma: '1',
        caseInsen: '1',
        hledejCo: query,
        'hledejKde[]': packages.toArray()
    };
}