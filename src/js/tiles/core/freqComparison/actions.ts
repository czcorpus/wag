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

import { LocalizedConfMsg } from '../../../common/types';
import { QueryMatch } from '../../../common/query';
import { ApiDataBlock } from '../../../common/api/kontext/freqs';



export enum ActionName {
    SetActiveBlock = 'FREQ_COMPARISON_SET_ACTIVE_BLOCK',
    PartialDataLoaded = 'FREQ_COMPARISON_PARTIAL_DATA_LOADED'
}

export interface DataLoadedPayload {
    block:ApiDataBlock;
    blockLabel?:LocalizedConfMsg;
    queryId:number;
    lemma:QueryMatch;
    critId:number;
}

// this is to allow other tiles to use this one as source of concordances - ConcLoadedPayload
export interface LoadFinishedPayload {
    concPersistenceIDs:Array<string>;
    corpusName:string;
}

export namespace Actions {

    export interface SetActiveBlock extends Action<{
        idx:number;
        tileId:number;
    }> {
        name: ActionName.SetActiveBlock;
    }

    export interface PartialDataLoaded<T> extends Action<{
        tileId:number;

    } & T> {
        name: ActionName.PartialDataLoaded;
    }
}