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

import { SingleCritQueryArgs } from '../api/kontext/freqTree';
import { LocalizedConfMsg } from '../types';


interface FreqTreeStateBase {
    isBusy:boolean;
    error:string;
    corpname:string;
    flimit:number;
    fpage:number;
    fttIncludeEmpty:boolean;
    fmaxitems:number;
}

export interface FreqTreeDataBlock {
    data:Immutable.Map<string,any>;
    ident:string;
    label:string;
    isReady:boolean;
}

export interface GeneralCritFreqTreeModelState extends FreqTreeStateBase {
    fcritTrees:Immutable.List<Immutable.List<string>>;
    treeLabels:Immutable.List<LocalizedConfMsg>;
    frequencyTree:Immutable.List<FreqTreeDataBlock>;
}

export function stateToAPIArgs(state:GeneralCritFreqTreeModelState, blockId:number, critLevel:number, subcname?:string):SingleCritQueryArgs {
    return {
        corpname: state.corpname,
        usesubcorp: subcname,
        fcrit: state.fcritTrees.get(blockId).get(critLevel),
        flimit: state.flimit,
        fpage: state.fpage,
        ftt_include_empty: state.fttIncludeEmpty ? 1 : 0,
        format: 'json'
    } as SingleCritQueryArgs;
};
