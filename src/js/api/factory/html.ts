/*
 * Copyright 2020 Tomas Machalek <tomas.machalek@gmail.com>
 * Copyright 2020 Institute of the Czech National Corpus,
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

import { CoreApiGroup } from '../coreGroups';
import { IAsyncKeyValueStore } from '../../types';
import { IGeneralHtmlAPI } from '../abstract/html';
import { WiktionaryHtmlAPI } from '../vendor/wiktionary/html';
import { RawHtmlAPI } from '../vendor/wdglance/html';
import { IApiServices } from '../../appServices';


export function createApiInstance(cache:IAsyncKeyValueStore, apiIdent:string, apiURL:string, apiServices:IApiServices):IGeneralHtmlAPI<{}> {

    switch (apiIdent) {
        case CoreApiGroup.WIKTIONARY:
            return new WiktionaryHtmlAPI(cache, apiURL, apiServices);
        case CoreApiGroup.WDGLANCE:
            return new RawHtmlAPI(cache, apiURL, apiServices);
        default:
            throw new Error(`HTML API "${apiIdent}" not found.`);
    }
}