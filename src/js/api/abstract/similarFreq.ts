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

import { FreqBand } from '../../query/index.js';
import { DataApi } from '../../types.js';
import { PosItem } from '../../postag.js';
import { MainPosAttrValues } from '../../conf/index.js';


export interface RequestArgs {
    domain:string;
    word:string;
    lemma:string;

    /**
     * Please note that here can be either WaG's `pos` or `upos`
     */
    pos:Array<string>;
    mainPosAttr:MainPosAttrValues;
    srchRange:number;
}

export interface SimilarFreqWord {
    lemma:string;
    pos:Array<PosItem>;
    upos:Array<PosItem>;
    ipm:number;
    flevel:FreqBand|null;
}

export interface Response {
    result:Array<SimilarFreqWord>;
}