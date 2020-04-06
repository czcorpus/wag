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
import { FreqSort } from '../api/kontext/freqs';
import { LocalizedConfMsg } from '../types';

export interface FreqBarModelStateBase {
    isBusy:boolean;
    error:string;
    corpname:string;
    concId:string;
    flimit:number;
    freqSort:FreqSort;
    fpage:number;
    fttIncludeEmpty:boolean;
    fmaxitems:number;
}

export interface GeneralSingleCritFreqBarModelState<T> extends FreqBarModelStateBase {
    fcrit:string;
    data:Array<T>;
}

export interface GeneralSingleCritFreqMultiQueryState<T> extends FreqBarModelStateBase {
    fcrit:string;
    data:Array<Array<T>>;
}

export interface FreqDataBlock<T> {
    data:Array<T>;
    ident:string;
    label:string;
    isReady:boolean;
}

export interface GeneralMultiCritFreqBarModelState<T> extends FreqBarModelStateBase {
    fcrit:Array<string>;
    critLabels:Array<LocalizedConfMsg>;
    blocks:Array<FreqDataBlock<T>>;
}

/**
 * SubqueryModeConf defines a special part
 * of the tile configuration which makes it
 * able to search for provided subquieries
 * in custom concordances.
 *
 * E.g. TreqTile produces some translations
 * and we want to find some freq. info
 * for most relevant ones (= subqueries).
 */
export interface SubqueryModeConf {
    concApiURL:string;
    maxNumSubqueries:number;
    langMapping:{[lang:string]:string};
}