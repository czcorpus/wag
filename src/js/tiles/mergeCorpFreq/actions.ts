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
import { DataRow } from '../../common/api/kontextFreqs';


export enum ActionName {
    LoadDataDone = 'MULTI_CORP_FREQ_LOAD_DATA_DONE'
}

export namespace Actions {

    export interface LoadDataDone extends Action<{
        data:Array<DataRow>;
        concId:string;
        tileId:number;

    }> {
        name: ActionName.LoadDataDone
    }
}