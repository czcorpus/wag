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
import { Line } from '../../../api/abstract/concordance.js';
import { Action } from 'kombo';
import { Actions as GlobalActions } from '../../../models/actions.js';

export interface CollExamplesLoadedPayload {
    data:Array<Line>;
    queryId:number;
    baseConcId:string;
}

export class Actions {

    static ShowLineMetadata:Action<{
        tileId:number;
        idx:number;
    }> = {
        name: 'CONC_FILTER_SHOW_LINE_METADATA'
    };

    static HideLineMetadata:Action<{
        tileId:number;
    }> = {
        name: 'CONC_FILTER_HIDE_LINE_METADATA'
    };

    static TileDataLoaded:Action<typeof GlobalActions.TileDataLoaded.payload & {}> = {
        name: GlobalActions.TileDataLoaded.name
    };


    static PartialTileDataLoaded:Action<typeof GlobalActions.TilePartialDataLoaded.payload & CollExamplesLoadedPayload> = {
        name: GlobalActions.TilePartialDataLoaded.name
    };

}