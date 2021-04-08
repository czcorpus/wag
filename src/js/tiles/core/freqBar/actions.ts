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

import { LocalizedConfMsg } from '../../../types';
import { ApiDataBlock } from '../../../api/abstract/freqs';
import { Actions as GlobalActions } from '../../../models/actions';


export interface DataLoadedPayload {
    block:ApiDataBlock;
    blockLabel?:LocalizedConfMsg;
    concId:string;
    critIdx:number;
}

export class Actions {

    static SetActiveBlock:Action<{
        idx:number;
        tileId:number;
    }> = {
        name: 'TT_DISTRIB_SET_ACTIVE_BLOCK'
    };

    static TileDataLoaded:Action<typeof GlobalActions.TileDataLoaded.payload & DataLoadedPayload> = {
        name: GlobalActions.TileDataLoaded.name
    };

    static isTileDataLoaded(a:Action):a is typeof Actions.TileDataLoaded {
        return a.name === Actions.TileDataLoaded.name &&
                a.payload['block'] && a.payload['concId'] && a.payload['critIdx'];
    }
}