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
import { CorpSrchTileConf } from '../../../common/tile';


export enum ActionName {
    ChangeTimeWindow = 'MULTI_WORD_TIME_DISTRIB_CHANGE_TIME_WINDOW',
    ChangeUnits = 'MULTI_WORD_TIME_DISTRIB_CHANGE_UNITS'
}

export interface TimeDistTileConf extends CorpSrchTileConf {

    apiType:string;

    apiURL:string;

    concApiURL?:string;

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
    isLast:boolean;
}

export interface DataFetchArgs {
    corpName:string;
    subcName:string;
    concId:string;
    queryId:number;
    origQuery:string;
}

export namespace Actions {

    export interface ChangeTimeWindow extends Action<{
        tileId:number;
        value:number;

    }> {
        name:ActionName.ChangeTimeWindow;
    }

    export interface ChangeUnits extends Action<{
        tileId:number;
        units:string;

    }> {
        name:ActionName.ChangeUnits;
    }
}
