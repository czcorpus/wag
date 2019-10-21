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
import { Action } from 'kombo';

import { ApiDataBlock } from '../../../common/api/kontext/freqComparison';
import { LocalizedConfMsg } from '../../../common/types';
import { LemmaVariant } from '../../../common/query';



export enum ActionName {
    SetActiveBlock = 'FREQ_COMPARISON_SET_ACTIVE_BLOCK'
}

export interface DataLoadedPayload {
    block:ApiDataBlock;
    blockLabel?:LocalizedConfMsg;
    critIdx:number;
    lemma:LemmaVariant;
}

export namespace Actions {

    export interface SetActiveBlock extends Action<{
        idx:number;
        tileId:number;
    }> {
        name: ActionName.SetActiveBlock;
    }
}