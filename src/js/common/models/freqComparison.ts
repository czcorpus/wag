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

import { DataRow, MultiCritQueryArgs, FreqSort } from '../api/kontext/freqs';
import { LocalizedConfMsg } from '../types';



interface FreqComparisonStateBase {
    isBusy:boolean;
    error:string;
    corpname:string;
    flimit:number;
    freqSort:FreqSort;
    fpage:number;
    fttIncludeEmpty:boolean;
    fmaxitems:number;
}

export interface FreqComparisonDataBlock<T> {
    data:Immutable.List<T>;
    words:Immutable.List<string>;
    ident:string;
    label:string;
    isReady:boolean;
}

export interface GeneralMultiCritFreqComparisonModelState<T=DataRow> extends FreqComparisonStateBase {
    fcrit:Immutable.List<string>;
    critLabels:Immutable.List<LocalizedConfMsg>;
    blocks:Immutable.List<FreqComparisonDataBlock<T>>;
}



export function stateToAPIArgs<T>(state:GeneralMultiCritFreqComparisonModelState<T>, critId?:number, subcname?:string):MultiCritQueryArgs {
    return {
        corpname: state.corpname,
        usesubcorp: subcname,
        fcrit: critId !== undefined ? state.fcrit.get(critId) : state.fcrit.toArray(),
        flimit: state.flimit,
        freq_sort: state.freqSort,
        fpage: state.fpage,
        ftt_include_empty: state.fttIncludeEmpty ? 1 : 0,
        format: 'json'
    } as MultiCritQueryArgs;
};
