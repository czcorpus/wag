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
import { CorpSrchTileConf, Backlink } from '../../../common/tile';


export interface TimeDistTileConf extends CorpSrchTileConf {

    apiType:string;

    apiURL:string|Array<string>;

    apiPriority:Array<number>;

    /**
     * E.g. doc.pubyear
     */
    fcrit:string;

    flimit:number;

    posQueryGenerator:[string, string];

    backlink?:Backlink;
}


export interface DataLoadedPayload {
    tileId:number;
    data?:Array<DataItemWithWCI>;
    dataCmp?:Array<DataItemWithWCI>;
    wordMainLabel?:string;
    concId?:string;
    origQuery?:string;
}


export enum ActionName {
    ChangeCmpWord = 'TIME_DISTRIB_CHANGE_CMP_WORD',
    SubmitCmpWord = 'TIME_DISTRIB_SUBMIT_CMP_WORD',
    ZoomMouseLeave = 'MULTI_WORD_ZOOM_MOUSE_LEAVE',
    ZoomMouseDown = 'MULTI_WORD_ZOOM_MOUSE_DOWN',
    ZoomMouseMove = 'MULTI_WORD_ZOOM_MOUSE_MOVE',
    ZoomMouseUp = 'MULTI_WORD_ZOOM_MOUSE_UP',
    ZoomReset = 'MULTI_WORD_ZOOM_RESET'
}

export interface DataItemWithWCI {
    datetime:string;
    freq:number;
    ipm:number;
    norm:number;
    ipmInterval:[number, number];
}

export namespace Actions {

    export interface ChangeCmpWord extends Action<{
        tileId:number;
        value:string;

    }> {
        name:ActionName.ChangeCmpWord;
    }

    export interface SubmitCmpWord extends Action<{
        tileId:number;

    }> {
        name:ActionName.SubmitCmpWord;
    }

    export interface ZoomMouseLeave extends Action<{
        tileId:number;

    }> {
        name:ActionName.ZoomMouseLeave;
    }

    export interface ZoomMouseDown extends Action<{
        tileId:number;
        value:number;

    }> {
        name:ActionName.ZoomMouseDown;
    }

    export interface ZoomMouseMove extends Action<{
        tileId:number;
        value:number;

    }> {
        name:ActionName.ZoomMouseMove;
    }

    export interface ZoomMouseUp extends Action<{
        tileId:number;
        value:number;

    }> {
        name:ActionName.ZoomMouseUp;
    }

    export interface ZoomReset extends Action<{
        tileId:number;

    }> {
        name:ActionName.ZoomReset;
    }
}

export enum SubchartID {
    MAIN = 'main',
    SECONDARY = 'secondary'
}
