/**
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

import { BacklinkWithArgs } from '../../page/tile';
import { DataRow } from '../../api/abstract/matchingDocs';


export interface KontextFreqBacklinkArgs {
    corpname:string;
    usesubcorp:string;
    q:string;
    fcrit:Array<string>;
    flimit:number;
    freq_sort:string;
    fpage:number;
    ftt_include_empty:number;
}

export interface MatchingDocsModelState {
    isBusy:boolean;
    isTweakMode: boolean;
    error:string;
    corpname:string;
    subcname:string;
    maxNumCategories:number;
    maxNumCategoriesPerPage:number;
    currPage:number;
    numPages:number;
    backlink:BacklinkWithArgs<{}>|null;
    subqSyncPalette:boolean;
    displayAttrs:Array<string>;
    searchAttrs:Array<string>|null;
    data:Array<DataRow>;
}