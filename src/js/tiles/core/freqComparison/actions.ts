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

import { LocalizedConfMsg } from '../../../types.js';
import { QueryMatch } from '../../../query/index.js';
import { ApiDataBlock } from '../../../api/abstract/freqs.js';
import { Actions as GlobalActions } from '../../../models/actions.js';
import { BacklinkWithArgs } from '../../../page/tile.js';


export interface DataLoadedPayload {
    block:ApiDataBlock;
    blockLabel?:LocalizedConfMsg;
    queryId:number;
    lemma:QueryMatch;
    critId:number;
    backlink:BacklinkWithArgs<{}>;
}

// this is to allow other tiles to use this one as source of concordances - ConcLoadedPayload
export interface LoadFinishedPayload {
    concPersistenceIDs:Array<string>;
    corpusName:string;
}

export class Actions {

    static SetActiveBlock:Action<{
        idx:number;
        tileId:number;
    }> = {
        name: 'FREQ_COMPARISON_SET_ACTIVE_BLOCK'
    };

    static TileDataLoaded:Action<typeof GlobalActions.TileDataLoaded.payload> = {
        name: GlobalActions.TileDataLoaded.name
    };

    static PartialTileDataLoaded:Action<typeof GlobalActions.TilePartialDataLoaded.payload & DataLoadedPayload> = {
        name: GlobalActions.TilePartialDataLoaded.name
    };
}