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

import { ResourceApi } from '../../types.js';
import { WordSimModelState } from '../../models/tiles/wordSim.js';
import { SubqueryPayload, RangeRelatedSubqueryValue, QueryMatch } from '../../query/index.js';


export type WordSimSubqueryPayload = SubqueryPayload<RangeRelatedSubqueryValue>;



export interface WordSimWord {
    word:string;
    score:number;
    interactionId?:string;
}

export interface WordSimApiResponse {
    words:Array<WordSimWord>;
}

export interface IWordSimApi<T> extends ResourceApi<T, WordSimApiResponse> {

    stateToArgs(state:WordSimModelState, queryMatch:QueryMatch):T;

    supportsTweaking():boolean;

    supportsMultiWordQueries():boolean;
}