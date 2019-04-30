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
import { CorpSrchTileConf } from '../../common/tile';


export interface TimeDistTileConf extends CorpSrchTileConf {

    tileType:'TimeDistribTile';

    apiType:string;

    apiURL:string;

    concApiURL?:string;

    /**
     * E.g. doc.pubyear
     */
    fcrit:string;

    timeAxisLegend:string;

    flimit:number;

    posQueryGenerator:[string, string];
}


export enum ActionName {
    ChangeCmpWord = 'TIME_DISTRIB_CHANGE_CMP_WORD',
    SubmitCmpWord = 'TIME_DISTRIB_SUBMIT_CMP_WORD'
}

export interface DataItemWithWCI {
    datetime:string;
    freq:number;
    ipm:number;
    norm:number;
    ipmInterval:[number, number];
}

export interface DataLoadedPayload {
    data:Array<DataItemWithWCI>;
    concId:string;
    subchartId:SubchartID;
    subcname:string;
    wordMainLabel:string;
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
}

export enum SubchartID {
    MAIN = 'main',
    SECONDARY = 'secondary'
}
