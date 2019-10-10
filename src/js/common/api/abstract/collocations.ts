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

import { SubqueryPayload, isSubqueryPayload, LemmaVariant } from '../../query';
import { DataApi, SourceDetails } from '../../types';
import { CollocModelState } from '../../models/collocations';
import { Observable } from 'rxjs';


// Sub-query related types

export interface CollocSubqueryValue {
    value:string;
    context:[number, number];
}

export type CollocSubqueryPayload = SubqueryPayload<CollocSubqueryValue>;


export function isCollocSubqueryPayload(payload:{}):payload is CollocSubqueryPayload {
    return isSubqueryPayload(payload) && payload.subqueries.length > 0 &&
            payload.subqueries[0].value['context'] !== undefined;
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
}

export interface CollApiResponse {
    concId:string;
    collHeadings:DataHeading;
    data:Array<DataRow>;
}

export enum SrchContextType {
    LEFT = 'lft',
    RIGHT = 'rgt',
    BOTH = 'both'
}


export interface CollocationApi<T> extends DataApi<T, CollApiResponse> {

    /**
     * @param dataSpec is either an ID of an existing concordance or a query
     */
    stateToArgs(state:CollocModelState, dataSpec:LemmaVariant|string):T;

    supportsLeftRightContext():boolean;

    getSourceDescription(tileId:number, uiLang:string, corpname:string):Observable<SourceDetails>;

}