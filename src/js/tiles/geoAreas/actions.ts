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
import { DataRow } from '../../shared/api/kontextFreqs';


export enum ActionName {
    LoadDataDone = 'GEO_AREAS_LOAD_DATA_DONE',
    SetHighlightedTableRow = 'GEO_AREAS_SET_HIGHLIGHTED_TABLE_ROW',
    ClearHighlightedTableRow = 'GEO_AREAS_CLEAR_HIGHLIGHTED_TABLE_ROW'
}

export namespace Actions {

    export interface LoadDataDone extends Action<{
        data:Array<DataRow>;
        concId:string;
        tileId:number;

    }> {
        name: ActionName.LoadDataDone
    }

    export interface SetHighlightedTableRow extends Action<{
        areaName:string;
        tileId:number;

    }> {
        name: ActionName.SetHighlightedTableRow;
    }

    export interface ClearHighlightedTableRow extends Action<{
        tileId:number;

    }> {
        name: ActionName.ClearHighlightedTableRow;
    }
}