/*
 * Copyright 2018 Tomas Machalek <tomas.machalek@gmail.com>
 * Copyright 2018 Institute of the Czech National Corpus,
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

import { QueryMatch } from '../../../query/index.js';
import { Backlink } from '../../../page/tile.js';
import { TooltipValues } from '../../../views/common/index.js';
import { DataRow } from './api.js';

export interface ModelSourceArgs {

    corpname:string;

    subcname:string|null;

    fcrit:string;

    freqType:'tokens'|'text-types';

    flimit:number;

    freqSort:string;

    fpage:number;

    posQueryGenerator:[string, string];

    fttIncludeEmpty?:boolean;

    fmaxitems?:number;

    corpusSize:number;

    viewInOtherWagUrl:string|null;

    /**
     * In case 'fcrit' describes a positional
     * attribute we have to replace an actual
     * value returned by freq. distrib. function
     * (which is equal to our query: e.g. for
     * the query 'house' the value will be 'house')
     * by something more specific (e.g. 'social media')
     */
    valuePlaceholder:string|null;

    isSingleCategory:boolean;

    uniqueColor:boolean;
}

export interface SourceMappedDataRow extends DataRow {
    sourceIdx:number;
    name:string;
    uniqueColor:boolean;
    viewInOtherWagUrl:string|null;
}



export interface MergeCorpFreqModelState {
    isBusy:boolean;
    isAltViewMode:boolean;
    error:string;

    /**
     * Frequency data.
     * The outer array separates queries in the "cmp" mode;
     * in the "single" mode, it has a size of 1.
     * The inner array represents multiple configured freq. resources.
     */
    data:Array<Array<SourceMappedDataRow>>;
    sources:Array<ModelSourceArgs>;
    pixelsPerCategory:number;
    tooltipData:{
        tooltipX:number;
        tooltipY:number;
        data:TooltipValues;
        caption:string;
        showClickTip:boolean;
    }|null;
    backlinks:Array<Backlink>;
    queryMatches:Array<QueryMatch>;
}
