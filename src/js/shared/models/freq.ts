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
import { DataRow, QueryArgs } from '../api/kontextFreqs';


export interface GeneralTTDistribModelState {
    isBusy:boolean;
    error:string;
    data:Immutable.List<DataRow>;
    corpname:string;
    concId:string;
    fcrit:string;
    flimit:number;
    freqSort:string;
    fpage:number;
    fttIncludeEmpty:boolean;
}

export const stateToAPIArgs = (state:GeneralTTDistribModelState, concId:string):QueryArgs => ({
    corpname: state.corpname,
    q: `~${concId ? concId : state.concId}`,
    fcrit: [state.fcrit],
    flimit: state.flimit.toString(),
    freq_sort: state.freqSort,
    fpage: state.fpage.toString(),
    ftt_include_empty: state.fttIncludeEmpty ? '1' : '0',
    format: 'json'
});