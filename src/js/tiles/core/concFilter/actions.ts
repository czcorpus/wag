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
import { Line } from '../../../common/api/abstract/concordance';
import { Action } from 'kombo';

export interface CollExamplesLoadedPayload {
    data:Array<Line>;
    isLast:boolean;
}

export enum ActionName {
    ShowLineMetadata = 'CONC_FILTER_SHOW_LINE_METADATA',
    HideLineMetadata = 'CONC_FILTER_HIDE_LINE_METADATA'
}

export namespace Actions {

    export interface ShowLineMetadata extends Action<{
        idx:number;
    }> {
        name:ActionName.ShowLineMetadata;
    }

    export interface HideLineMetadata extends Action<{
    }> {
        name:ActionName.HideLineMetadata;
    }

}