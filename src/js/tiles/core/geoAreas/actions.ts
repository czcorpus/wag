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
import { TargetDataRow } from './views/compare.js';
import { Actions as GlobalActions } from '../../../models/actions.js';
import { DataRow } from '../../../api/vendor/mquery/freqs.js';


export interface PartialDataLoadedPayload {
    tileId:number;
    mapSVG:string|null;
    data:Array<DataRow>;
    queryId:number;
}

// this is to allow other tiles to use this one as source of concordances - ConcLoadedPayload
export interface LoadFinishedPayload {
    corpusName:string;
}

export class Actions {

    static ShowAreaTooltip:Action<{
        tileId:number;
        areaName:string;
        areaIpmNorm:number;
        areaData:Array<TargetDataRow>;
        tooltipX:number;
        tooltipY:number;

    }> = {
        name: 'MULTI_WORD_GEO_AREAS_SHOW_AREA_TOOLTIP'
    }

    static HideAreaTooltip:Action<{
        tileId:number;

    }> = {
        name: 'MULTI_WORD_GEO_AREAS_HIDE_AREA_TOOLTIP'
    }

    static TileDataLoaded:Action<typeof GlobalActions.TileDataLoaded.payload & LoadFinishedPayload> = {
        name: GlobalActions.TileDataLoaded.name
    };


    static PartialTileDataLoaded:Action<typeof GlobalActions.TilePartialDataLoaded.payload & PartialDataLoadedPayload> = {
        name: GlobalActions.TilePartialDataLoaded.name
    };
}