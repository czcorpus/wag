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

import { ConcordanceMinState } from '../../models/tiles/concordance';
import { QueryMatch, SubqueryPayload } from '../../query';
import { SourceDetails, ResourceApi } from '../../types';
import { Observable } from 'rxjs';


/**
 * A general action notifying about single query
 * (out of possibly multiple queries) concordance load.
 */
export interface SingleConcLoadedPayload extends SubqueryPayload {
    tileId:number;
    data:ConcResponse;
}

export type LineElementType = ''|'strc'|'attr'|'str'|'coll';

export interface LineElement {
    type:LineElementType;
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
    metadata?:Array<{label:string; value:string}>;
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
    kwicNumTokens?:number;
}

export enum ViewMode {
    KWIC = 'kwic',
    SENT = 'sen',
    ALIGN = 'align'
}


export interface IConcordanceApi<T> extends ResourceApi<T, ConcResponse> {

    stateToArgs(state:ConcordanceMinState, lvar:QueryMatch|null, lvarIdx:number, otherLangCql:string|null):T;

    getSourceDescription(tileId:number, lang:string, corpname:string):Observable<SourceDetails>;

    mkMatchQuery(lvar:QueryMatch, generator:[string, string]):string;

    /**
     * Note: the first item will be set as an initial one
     */
    getSupportedViewModes():Array<ViewMode>;

}