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

import { Action } from 'kombo';
import { WordSimWord, WordSimSubqueryPayload } from '../../../api/abstract/wordSim.js';
import { OperationMode } from '../../../models/tiles/wordSim.js';
import { Actions as GlobalActions } from '../../../models/actions.js';


export interface DataLoadedPayload extends WordSimSubqueryPayload {
    tileId:number;
    queryId:number;
    words:Array<WordSimWord>;
}


export class Actions {

    static SetOperationMode:Action<{
        tileId:number;
        value:OperationMode;
    }> = {
        name: 'WORDSIM_SET_OPERATION_MODE'
    }

    static TileDataLoaded:Action<typeof GlobalActions.TileDataLoaded.payload & DataLoadedPayload> = {
        name: GlobalActions.TileDataLoaded.name
    };

}