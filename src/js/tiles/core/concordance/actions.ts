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

import { Actions as GlobalActions } from '../../../models/actions.js';
import { SubqueryPayload } from '../../../query/index.js';
import { ConcResponse, ViewMode } from '../../../api/vendor/mquery/concordance/common.js';


export interface ConcLoadedPayload {
    corpusName:string;
    subcorpusName?:string;
    concPersistenceIDs:Array<string>;
}

export interface PartialDataPayload extends SubqueryPayload {
    data:ConcResponse;
}

export function isConcLoadedPayload(p:any):p is ConcLoadedPayload {
    return p.concPersistenceIDs !== undefined && p.corpusName !== undefined;
}

export class Actions {

    static LoadNextPage:Action<{
        tileId:number;
    }> = {
        name: 'CONCORDANCE_LOAD_NEXT_PAGE'
    };

    static LoadPrevPage:Action<{
        tileId:number;
    }> = {
        name: 'CONCORDANCE_LOAD_PREV_PAGE'
    };

    static SetViewMode:Action<{
        tileId:number;
        mode:ViewMode;
    }> = {
        name: 'CONCORDANCE_SET_VIEW_MODE'
    };

    static SetVisibleQuery:Action<{
        tileId:number;
        queryIdx:number;
    }> = {
        name: 'CONCORDANCE_SET_VISIBLE_QUERY'
    };

    static ShowLineMetadata:Action<{
        tileId:number;
        idx:number;
    }> = {
        name: 'CONCORDANCE_SHOW_LINE_METADATA'
    };

    static HideLineMetadata:Action<{
        tileId:number;
    }> = {
        name: 'CONCORDANCE_HIDE_LINE_METADATA'
    };

    static TileDataLoaded:Action<typeof GlobalActions.TileDataLoaded.payload & ConcLoadedPayload> = {
        name: GlobalActions.TileDataLoaded.name
    };

    static isTileDataLoaded(a:Action):a is typeof Actions.TileDataLoaded {
        return a.name === Actions.TileDataLoaded.name &&
                !!a.payload['corpusName'] && !!a.payload['concPersistenceIDs'];
    }


    static PartialTileDataLoaded:Action<typeof GlobalActions.TilePartialDataLoaded.payload &
            PartialDataPayload> = {
        name: GlobalActions.TilePartialDataLoaded.name
    };

    static isPartialTileDataLoaded(a:Action):a is typeof Actions.PartialTileDataLoaded {
        return a.name === Actions.PartialTileDataLoaded.name &&
                !!a.payload['data'] && !!a.payload['tileId'];
    }

}