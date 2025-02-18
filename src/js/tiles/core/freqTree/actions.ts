/*
 * Copyright 2019 Martin Zimandl <martin.zimandl@gmail.com>
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
import { Actions as GlobalActions } from '../../../models/actions.js';



export interface DataLoadedPayload {
    data:{[k:string]:any};
    // this is to allow other tiles to use this one as source of concordances - ConcLoadedPayload
    concPersistenceIDs:Array<string>;
    corpusName:string;
}

export class Actions {

    static SetActiveBlock:Action<{
        idx:number;
        tileId:number;
    }> = {
        name: 'FREQ_TREE_SET_ACTIVE_BLOCK'
    };

    static SetZoom:Action<{
        tileId:number;
        blockId:number;
        variantId:number;
        category:string;
    }> = {
        name: 'FREQ_TREE_SET_ZOOM'
    };

    static TileDataLoaded:Action<typeof GlobalActions.TileDataLoaded.payload & DataLoadedPayload> = {
        name: GlobalActions.TileDataLoaded.name
    };

}