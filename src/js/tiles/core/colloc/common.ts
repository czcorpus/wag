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
import { Action } from 'kombo';
import { SubqueryPayload, QueryMatch } from '../../../query/index.js';
import { Actions as GlobalActions } from '../../../models/actions.js';
import { Backlink } from '../../../page/tile.js';
import { Line } from '../../../api/vendor/mquery/concordance/common.js';


export enum CollocMetric {
    T_SCORE = 't',
    MI = 'm',
    MI3 = '3',
    LOG_LKL = 'l',
    MIN_SENS = 's',
    LOG_DICE = 'd',
    MI_LOG_F = 'p',
    REL_FREQ = 'f'
}

export interface DataLoadedPayload extends SubqueryPayload {
    data:Array<DataRow>;
    heading:DataHeading;
}


export class Actions {

    static SetSrchContextType:Action<{
        tileId:number;
        ctxType:SrchContextType;
    }> = {
        name: 'COLLOCATIONS_SET_SRCH_CONTEXT_TYPE'
    };

    static TileDataLoaded:Action<typeof GlobalActions.TileDataLoaded.payload & {}> = {
        name: GlobalActions.TileDataLoaded.name
    };

    static isTileDataLoaded(a:Action):a is typeof Actions.TileDataLoaded {
        return a.name === GlobalActions.TileDataLoaded.name &&
            a.payload['data'] && a.payload['heading'] && a.payload['queryId'];
    }

    static PartialTileDataLoaded:Action<typeof GlobalActions.TilePartialDataLoaded.payload & DataLoadedPayload> = {
        name: GlobalActions.TilePartialDataLoaded.name
    };
}


// API related types

export type DataHeading = Array<{
    label:string;
    ident:string;
}>;


export interface DataRow {
    str:string;
    stats:Array<number>;
    freq:number;
    nfilter:[string, string];
    pfilter:[string, string];
    interactionId:string;
    examples?:{
        text:Array<Line>;
        ref:string;
    }
}

export interface CollApiResponse {
    collHeadings:DataHeading;
    data:Array<DataRow>;
}

export enum SrchContextType {
    LEFT = 'lft',
    RIGHT = 'rgt',
    BOTH = 'both'
}


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

    backlinks:Array<Backlink>;

    posQueryGenerator:[string, string];
}


interface collItem {
    word:string;
    freq:number;
    score:number;
    examples:Array<Line>;
}


export interface collWithExamplesResponse {
    concSize:number;
    corpusSize:number;
    subcSize?:number;
    colls:Array<collItem>;
    measure:string;
    srchRange:[number, number];
    error?:string;
    resultType:'collWithExamples';
}