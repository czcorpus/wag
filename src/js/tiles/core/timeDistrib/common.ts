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
import { CorpSrchTileConf } from '../../../page/tile.js';
import { Actions as GlobalActions } from '../../../models/actions.js';


export interface TimeDistTileConf extends CorpSrchTileConf {

    apiURL:string;

    maxItems:number;

    fcrit:string;

    fromYear?:number;

    toYear?:number;

    posQueryGenerator:[string, string];

    subcBacklinkLabel?:{[subc:string]:string};

    showMeasuredFreq?:boolean;
}


export interface DataLoadedPayload {
    tileId:number;
    queryId?:number;
    overwritePrevious?:boolean;
    data?:Array<DataItemWithWCI>;
    dataCmp?:Array<DataItemWithWCI>;
    wordMainLabel?:string;
    origQuery?:string;
}

export interface DataItemWithWCI {
    datetime:string;
    freq:number;
    ipm:number;
    norm:number;
    ipmInterval:[number, number];
}

export class Actions {

    static ChangeDisplayObserved:Action<{
        tileId:number;
        value:boolean;

    }> = {
        name: 'TIME_DISTRIB_CHANGE_DISPLAY_OBSERVED'
    };

    static ChangeUseAbsFreq:Action<{
        tileId:number;
        value:boolean;

    }> = {
        name: 'TIME_DISTRIB_CHANGE_USE_ABS_FREQ'
    };

	static ChangeCmpWord:Action<{
        tileId:number;
        value:string;

    }> = {
        name: 'TIME_DISTRIB_CHANGE_CMP_WORD'
    };

	static SubmitCmpWord:Action<{
        tileId:number;

    }> = {
        name: 'TIME_DISTRIB_SUBMIT_CMP_WORD'
    };

	static ZoomMouseLeave:Action<{
        tileId:number;

    }> = {
        name: 'MULTI_WORD_ZOOM_MOUSE_LEAVE'
    };

	static ZoomMouseDown:Action<{
        tileId:number;
        value:number;

    }> = {
        name: 'MULTI_WORD_ZOOM_MOUSE_DOWN'
    };

	static ZoomMouseMove:Action<{
        tileId:number;
        value:number;

    }> = {
        name: 'MULTI_WORD_ZOOM_MOUSE_MOVE'
    }

	static ZoomMouseUp:Action<{
        tileId:number;
        value:number;

    }> = {
        name: 'MULTI_WORD_ZOOM_MOUSE_UP'
    };

	static ZoomReset:Action<{
        tileId:number;

    }> = {
        name: 'MULTI_WORD_ZOOM_RESET'
    }

    static ChangeTimeWindow:Action<{
        tileId:number;
        value:number;

    }> = {
        name: 'MULTI_WORD_TIME_DISTRIB_CHANGE_TIME_WINDOW'
    }

	static ChangeUnits:Action<{
        tileId:number;
        units:string;

    }> = {
        name: 'MULTI_WORD_TIME_DISTRIB_CHANGE_UNITS'
    }

    static TileDataLoaded:Action<typeof GlobalActions.TileDataLoaded.payload> = {
        name: GlobalActions.TileDataLoaded.name
    };


    static PartialTileDataLoaded:Action<typeof GlobalActions.TilePartialDataLoaded.payload & DataLoadedPayload> = {
        name: GlobalActions.TilePartialDataLoaded.name
    };

}

export enum SubchartID {
    MAIN = 'main',
    SECONDARY = 'secondary'
}
