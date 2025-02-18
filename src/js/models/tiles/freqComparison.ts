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
import { LocalizedConfMsg } from '../../types.js';
import { DataRow } from '../../api/abstract/freqs.js';



interface FreqComparisonStateBase {
    isBusy:boolean;
    error:string;
    corpname:string;
    flimit:number;
    freqSort:string;
    fpage:number;
    fttIncludeEmpty:boolean;
    fmaxitems:number;
}

export interface FreqComparisonDataBlock<T> {
    data:Array<T>;
    words:Array<string>;
    ident:string;
    label:string;
    isReady:boolean;
}

export interface GeneralMultiCritFreqComparisonModelState<T=DataRow> extends FreqComparisonStateBase {
    fcrit:Array<string>;
    freqType:'tokens'|'text-types';
    critLabels:Array<LocalizedConfMsg>;
    blocks:Array<FreqComparisonDataBlock<T>>;
}
