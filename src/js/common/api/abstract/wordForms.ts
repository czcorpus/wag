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

import { DataApi } from '../../types';
import { QueryPoS } from '../../query';


export interface RequestArgs {
    lang:string;
    lemma:string;
    pos:Array<QueryPoS>;
}

export function isRequestArgs(v:RequestArgs|RequestConcArgs):v is RequestArgs {
    return typeof v['lang'] === 'string' && typeof v['lemma'] === 'string' && Array.isArray(v['pos']);
}

export interface RequestConcArgs {
    corpName:string;
    subcorpName?:string;
    concPersistenceID:string;
}


export interface WordFormItem {
    value:string;
    freq:number;
    ratio:number;
    interactionId?:string;
}

export interface Response {
    forms:Array<WordFormItem>;
}


export type WordFormsApi = DataApi<RequestArgs|RequestConcArgs, Response>;