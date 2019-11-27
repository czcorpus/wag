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
import * as Immutable from 'immutable';
import { DataRow } from '../../../common/api/kontext/freqs';
import { TargetDataRow } from './views';



export enum ActionName {
    ShowAreaTooltip = 'MULTI_WORD_GEO_AREAS_SHOW_AREA_TOOLTIP',
    HideAreaTooltip = 'MULTI_WORD_GEO_AREAS_HIDE_AREA_TOOLTIP',
    PartialDataLoaded = 'MULTI_WORD_GEO_AREAS_PARTIAL_DATA_LOADED'
}

export interface PartialDataLoadedPayload {
    tileId:number;
    mapSVG:string|null;
    data:Array<DataRow>;
    concId:string;
    queryId:number;
}

// this is to allow other tiles to use this one as source of concordances - ConcLoadedPayload
export interface LoadFinishedPayload {
    concPersistenceIDs:Array<string>;
    corpusName:string;
}

export namespace Actions {

    export interface PartialDataLoaded extends Action<PartialDataLoadedPayload> {
        name: ActionName.PartialDataLoaded;
    }

    export interface ShowAreaTooltip extends Action<{
        tileId:number;
        areaName:string;
        areaIpmNorm:number;
        areaData:Immutable.Iterable<number, TargetDataRow>;
        tooltipX:number;
        tooltipY:number;

    }> {
        name: ActionName.ShowAreaTooltip;
    }

    export interface HideAreaTooltip extends Action<{
        tileId:number;

    }> {
        name: ActionName.HideAreaTooltip;
    }
}