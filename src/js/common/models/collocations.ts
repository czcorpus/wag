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
import { SrchContextType, DataRow, DataHeading } from '../api/abstract/collocations';
import { BacklinkWithArgs } from '../tile';
import { CollocMetric } from '../../tiles/core/colloc/common';
import { QueryMatch } from '../query';


export function ctxToRange(ctxType:SrchContextType, range:number):[number, number] {
    switch (ctxType) {
        case SrchContextType.BOTH:
            return [-1 * range, range];
        case SrchContextType.LEFT:
            return [-1 * range, 0];
        case SrchContextType.RIGHT:
            return [0, range];
        default:
            throw new Error('unknown ctxType ' + ctxType);
    }
}


export interface CollocModelState {
    isBusy:boolean;
    tileId:number;
    isTweakMode:boolean;
    isAltViewMode:boolean;
    error:string|null;
    widthFract:number;
    corpname:string;
    concIds:Array<string>;
    selectedText:string;

    /**
     * A positional attribute used to analyze the text
     */
    tokenAttr:string;

    /**
     * KWIC search range (-a, +a)
     */
    srchRange:number;

    /**
     * KWIC search range type: (-a, 0), (-a, a), (0, a)
     */
    srchRangeType:SrchContextType;

    /**
     * Min. required absolute freq. of a term
     * (i.e. not only within searched context)
     */
    minAbsFreq:number;

    /**
     * Min. required absolute freq. of a term
     * when looking only in the searched context
     */
    minLocalAbsFreq:number;

    appliedMetrics:Array<CollocMetric>; // TODO generalize

    sortByMetric:CollocMetric;

    data:Array<Array<DataRow>>;

    heading:DataHeading;

    citemsperpage:number;

    backlink:BacklinkWithArgs<{}>;

    queryMatches:Array<QueryMatch>;

    posQueryGenerator:[string, string];
}