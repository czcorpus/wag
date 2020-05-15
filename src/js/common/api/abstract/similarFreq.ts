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

import { FreqBand } from '../../query';
import { DataApi } from '../../types';
import { PosItem } from '../../postag';


export interface RequestArgs {
    lang:string;
    word:string;
    lemma:string;
    pos:Array<string>;
    srchRange:number;
}

export interface SimilarFreqWord {
    lemma:string;
    pos:Array<PosItem>;
    ipm:number;
    flevel:FreqBand|null;
}

export interface Response {
    result:Array<SimilarFreqWord>;
}

export interface SimilarFreqDbAPI extends DataApi<RequestArgs, Response> {
}