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

import { DataRow } from '../../common/api/kontext/freqs';



export enum ActionName {
    ShowAreaTooltip = 'GEO_AREAS_SHOW_AREA_TOOLTIP',
    HideAreaTooltip = 'GEO_AREAS_HIDE_AREA_TOOLTIP'
}

export interface DataLoadedPayload {
    data:Array<DataRow>;
    mapSVG:string|null;
    concId:string;
}

export namespace Actions {

    export interface ShowAreaTooltip extends Action<{
        tileId:number;
        areaIdx:number;
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