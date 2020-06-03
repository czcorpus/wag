/*
 * Copyright 2019 Tomas Machalek <tomas.machalek@gmail.com>
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

import { DataApi } from '../../types';


/**
 * General HTML api describes an API for fetching data in an HTML
 * form which are injected into a tile. Please note that in general
 * this can be dangerous from the security point of view as the injected
 * code becomes part of the page with full access. Use this only
 * along with a service you can fully trust (e.g. your own service
 * or a service from a trusted partner).
 */
export interface IGeneralHtmlAPI<T> extends DataApi<T, string|null> {
    stateToArgs(state:{}, query:string):T;
    supportsMultiWordQueries():boolean;
}