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
import { QueryArgs, DataRow } from '../api/kontextFreqs';
import { LocalizedConfMsg } from '../types';

interface TTDistribModelStateBase {
    isBusy:boolean;
    error:string;
    corpname:string;
    concId:string;
    flimit:number;
    freqSort:string;
    fpage:number;
    fttIncludeEmpty:boolean;
    fmaxitems:number;
}

export interface GeneralTTDistribModelState<T=DataRow> extends TTDistribModelStateBase {
    fcrit:string;
    data:Immutable.List<T>;
}

export interface FreqDataBlock<T> {
    data:Immutable.List<T>;
    ident:string;
    label:string;
}

export interface GeneralMultiCritTTDistribModelState<T> extends TTDistribModelStateBase {
    fcrit:Immutable.List<string>;
    critLabels:Immutable.List<LocalizedConfMsg>;
    blocks:Immutable.List<FreqDataBlock<T>>;
}

export const stateToAPIArgs = <T>(state:GeneralTTDistribModelState<T>|GeneralMultiCritTTDistribModelState<T>, concId:string, subcname?:string):QueryArgs => ({
    corpname: state.corpname,
    usesubcorp: subcname,
    q: `~${concId ? concId : state.concId}`,
    fcrit: typeof state.fcrit === 'string' ? [state.fcrit] : state.fcrit.toArray(),
    flimit: state.flimit.toString(),
    freq_sort: state.freqSort,
    fpage: state.fpage.toString(),
    ftt_include_empty: state.fttIncludeEmpty ? '1' : '0',
    format: 'json'
});