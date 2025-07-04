/*
 * Copyright 2023 Martin Zimandl <martin.zimandl@gmail.com>
 * Copyright 2023 Institute of the Czech National Corpus,
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
import { Actions as GlobalActions } from '../../../models/actions.js';
import { SCollsData, SCollsExamples, SCollsQueryType } from './api/scollex.js';


export class Actions {

    static TileDataLoaded:Action<typeof GlobalActions.TileDataLoaded.payload & {
        qType:SCollsQueryType;
        data:SCollsData;
    }> = {
        name: GlobalActions.TileDataLoaded.name
    };

    static ShowExampleWindow:Action<{
        tileId:number;
        query:string;
        data:SCollsExamples;
    }> = {
        name: 'SYNTACTIC_COLLS_SHOW_EXAMPLE_WINDOW'
    };

    static HideExampleWindow:Action<{
        tileId:number;
    }> = {
        name: 'SYNTACTIC_COLLS_HIDE_EXAMPLE_WINDOW'
    };

    static ClickForExample:Action<{
        tileId:number;
        qType:SCollsQueryType;
        word:string;
    }> = {
        name: 'SYNTACTIC_COLLS_CLICK_FOR_EXAMPLE'
    }

}