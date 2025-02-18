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
import { BacklinkWithArgs, CorpSrchTileConf } from '../../../page/tile.js';
import { Actions as GlobalActions } from '../../../models/actions.js';
import { CustomArgs } from '../../../api/abstract/timeDistrib.js';


export interface TimeDistTileConf extends CorpSrchTileConf {

    apiType:string;

    apiURL:string|Array<string>;

    apiPriority?:Array<number>;

    customApiArgs?:CustomArgs;

    /**
     * E.g. doc.pubyear
     */
    fcrit:string;

    flimit:number;

    posQueryGenerator:[string, string];

}

export type LemmaData = Array<DataItemWithWCI>;

export interface DataItemWithWCI {
    datetime:string;
    freq:number;
    ipm:number;
    norm:number;
    ipmInterval:[number, number];
}

export interface DataLoadedPayload {
    tileId:number;
    queryId:number;
    origQuery:string;
    data:Array<DataItemWithWCI>;
    backlink:BacklinkWithArgs<{}>;
}


export class Actions {

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
    }

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

    static TileDataLoaded:Action<typeof GlobalActions.TileDataLoaded.payload & DataLoadedPayload> = {
        name: GlobalActions.TileDataLoaded.name
    };


    static PartialTileDataLoaded:Action<typeof GlobalActions.TilePartialDataLoaded.payload & DataLoadedPayload> = {
        name: GlobalActions.TilePartialDataLoaded.name
    };
}
