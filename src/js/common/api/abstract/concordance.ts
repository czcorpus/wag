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

import { ConcordanceMinState } from '../../models/concordance';
import { LemmaVariant, SubqueryPayload } from '../../query';
import { DataApi, SourceDetails } from '../../types';
import { Observable } from 'rxjs';


/**
 * A general action notifying about single query
 * (out of possibly multiple queries) concordance load.
 */
export interface SingleConcLoadedPayload extends SubqueryPayload {
    tileId:number;
    data:ConcResponse;
}


export interface LineElement {
    'class':string;
    str:string;
    mouseover?:Array<string>;
}

export interface Line {
    left:Array<LineElement>;
    kwic:Array<LineElement>;
    right:Array<LineElement>;
    align?:Array<{
        left:Array<LineElement>;
        kwic:Array<LineElement>;
        right:Array<LineElement>;
        toknum:number;
    }>;
    toknum:number;
    metadata?:Array<{value:string; label:string}>;
    interactionId?:string;
    isHighlighted?:boolean;
}

export interface ConcResponse {
    query:string;
    corpName:string;
    primaryCorp?:string;
    subcorpName:string;
    lines:Array<Line>;
    concsize:number;
    arf:number;
    ipm:number;
    messages:Array<[string, string]>;
    concPersistenceID:string;
}

export enum ViewMode {
    KWIC = 'kwic',
    SENT = 'sen',
    ALIGN = 'align'
}


export interface IConcordanceApi<T> extends DataApi<T, ConcResponse> {

    stateToArgs(state:ConcordanceMinState, lvar:LemmaVariant|null, lvarIdx:number, otherLangCql:string|null):T;

    getSourceDescription(tileId:number, uiLang:string, corpname:string):Observable<SourceDetails>;

}