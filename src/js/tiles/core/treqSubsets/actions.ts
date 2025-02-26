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
import { WordTranslation } from '../../../api/abstract/translations.js';
import { Actions as GlobalActions } from '../../../models/actions.js';
import { SubqueryPayload } from '../../../query/index.js';


export interface DataLoadedPayload {
    query:string;
    lines:Array<WordTranslation>;
    sum:number;
    subsetId:string|null;
}


export class Actions {

    static TileDataLoaded:Action<typeof GlobalActions.TileDataLoaded.payload & SubqueryPayload> = {
	    name: GlobalActions.TileDataLoaded.name
    };

    static PartialTileDataLoaded:Action<typeof GlobalActions.TilePartialDataLoaded.payload & DataLoadedPayload> = {
	    name: GlobalActions.TilePartialDataLoaded.name
    };

}
