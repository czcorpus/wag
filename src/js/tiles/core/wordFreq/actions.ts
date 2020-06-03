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

import { SimilarFreqWord } from '../../../api/abstract/similarFreq';
import { Action } from 'kombo';

export interface DataLoadedPayload {
    data:Array<SimilarFreqWord>;
}

export enum ActionName {
    ExpandLemmaPos = 'FREQ_COMPARISON_SET_ACTIVE_BLOCK'
}

export namespace Actions {

    export interface ExpandLemmaPos extends Action<{
        lemma:string;
        tileId:number;
    }> {
        name: ActionName.ExpandLemmaPos;
    }
}