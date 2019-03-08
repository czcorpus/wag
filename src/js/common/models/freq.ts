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
import { DataRow, SingleCritQueryArgs, MultiCritQueryArgs, BacklinkArgs } from '../api/kontextFreqs';
import { LocalizedConfMsg, Backlink, BacklinkWithArgs, HTTPMethod } from '../types';


interface FreqBarModelStateBase {
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

export interface GeneralSingleCritFreqBarModelState<T=DataRow> extends FreqBarModelStateBase {
    fcrit:string;
    data:Immutable.List<T>;
}

function isMultiCritState<T>(state:GeneralSingleCritFreqBarModelState<T>|GeneralMultiCritFreqBarModelState<T>): state is GeneralMultiCritFreqBarModelState<T> {
    return (<GeneralMultiCritFreqBarModelState<T>>state).blocks !== undefined;
}

export interface FreqDataBlock<T> {
    data:Immutable.List<T>;
    ident:string;
    label:string;
}

export interface GeneralMultiCritFreqBarModelState<T=DataRow> extends FreqBarModelStateBase {
    fcrit:Immutable.List<string>;
    critLabels:Immutable.List<LocalizedConfMsg>;
    blocks:Immutable.List<FreqDataBlock<T>>;
}



export function stateToAPIArgs<T>(state:GeneralSingleCritFreqBarModelState<T>, concId:string, subcname?:string):SingleCritQueryArgs;
export function stateToAPIArgs<T>(state:GeneralMultiCritFreqBarModelState<T>, concId:string, subcname?:string):MultiCritQueryArgs;
export function stateToAPIArgs<T>(state:GeneralSingleCritFreqBarModelState<T>|GeneralMultiCritFreqBarModelState<T>, concId:string, subcname?:string) {

    if (isMultiCritState(state)) {
        return {
            corpname: state.corpname,
            usesubcorp: subcname,
            q: `~${concId ? concId : state.concId}`,
            fcrit: state.fcrit.toArray(),
            flimit: state.flimit.toString(),
            freq_sort: state.freqSort,
            fpage: state.fpage.toString(),
            ftt_include_empty: state.fttIncludeEmpty ? '1' : '0',
            format: 'json'
        } as MultiCritQueryArgs;

    } else {
        return {
            corpname: state.corpname,
            usesubcorp: subcname,
            q: `~${concId ? concId : state.concId}`,
            fcrit: state.fcrit,
            flimit: state.flimit.toString(),
            freq_sort: state.freqSort,
            fpage: state.fpage.toString(),
            ftt_include_empty: state.fttIncludeEmpty ? '1' : '0',
            format: 'json'
        } as SingleCritQueryArgs;
    }
};


export const createBackLink = <T>(state:GeneralMultiCritFreqBarModelState<T>|GeneralSingleCritFreqBarModelState<T>,
            backlink:Backlink, concId:string):BacklinkWithArgs<BacklinkArgs> => {
    return backlink ?
        {
            url: backlink.url,
            method: backlink.method || HTTPMethod.GET,
            label: backlink.label,
            args: {
                corpname: state.corpname,
                usesubcorp: null,
                q: `~${concId}`,
                fcrit: isMultiCritState(state) ? state.fcrit.toArray() : [state.fcrit],
                flimit: state.flimit.toFixed(),
                freq_sort: state.freqSort,
                fpage: state.fpage.toFixed(),
                ftt_include_empty: state.fttIncludeEmpty ? '1' : '0'
            }
        } :
        null;
};

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