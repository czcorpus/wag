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
import { DataRow } from '../../../common/api/abstract/matchingDocs';



export enum ActionName {
    SetActiveBlock = 'DOC_TILE_SET_ACTIVE_BLOCK',
    NextPage = 'DOC_TILE_NEXT_PAGE',
    PreviousPage = 'DOC_TILE_PREVIOUS_PAGE',
}

export interface DataLoadedPayload {
    data:Array<DataRow>;
    concId:string;
}

export namespace Actions {

    export interface NextPage extends Action<{
        tileId:number;
    }> {
        name: ActionName.NextPage;
    }

    export interface PreviousPage extends Action<{
        tileId:number;
    }> {
        name: ActionName.PreviousPage;
    }
}