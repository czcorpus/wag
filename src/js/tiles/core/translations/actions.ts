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
import { SubqueryPayload } from '../../../query/index.js';
import { Actions as GlobalActions } from '../../../models/actions.js';
import { Action } from 'kombo';
import { TranslationResponse } from './api.js';

export interface DataLoadedPayload extends SubqueryPayload {
    query: string;
    data: TranslationResponse;
    subqueries: Array<{
        value: {
            value: string;
            context: [number, number];
        };
        color: string;
    }>;
}

export function isTranslationsPayload(
    payload: any
): payload is DataLoadedPayload {
    return payload['query'] && payload['data'] && payload['subqueries'];
}

export class Actions {
    static TileDataLoaded: Action<
        typeof GlobalActions.TileDataLoaded.payload & DataLoadedPayload
    > = {
        name: GlobalActions.TileDataLoaded.name,
    };
}
