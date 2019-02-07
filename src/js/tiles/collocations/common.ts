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

export interface DataRow {
    str:string;
    stats:Array<number>;
    freq:number;
    nfilter:[string, string];
    pfilter:[string, string];
    wcFontSize:number;
}

export type DataHeading = Array<{
    label:string;
    ident:string;
}>;

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

export interface CollApiArgs {
    corpname:string;
    q:string;
    cattr:string;
    cfromw:number;
    ctow:number;
    cminfreq:number;
    cminbgr:number;
    cbgrfns:Array<string>;
    csortfn:string;
    citemsperpage:number;
    format:'json';
}

export enum SrchContextType {
    LEFT = 'lft',
    RIGHT = 'rgt',
    BOTH = 'both'
}

export enum ActionName {
    DataLoadDone = 'COLLOCATIONS_DATA_LOAD_DONE',
    SetSrchContextType = 'COLLOCATIONS_SET_SRCH_CONTEXT_TYPE'
}


export namespace Actions {

    export interface DataLoadDone extends Action<{
        tileId:number;
        data:Array<DataRow>;
        heading:DataHeading;
        concId:string;
    }> {
        name:ActionName.DataLoadDone;
    }

    export interface SetSrchContextType extends Action<{
        tileId:number;
        ctxType:SrchContextType;

    }> {
        name:ActionName.SetSrchContextType;
    }
}