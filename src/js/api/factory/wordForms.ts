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

import { IWordFormsApi } from '../abstract/wordForms.js';
import { WordFormsAPI as WordFormsKontextApi } from '../vendor/kontext/wordForms.js';
import { WordFormsAPI as WordFormsMqueryApi } from '../vendor/mquery/wordForms.js';
import { CoreApiGroup, supportedCoreApiGroups } from '../coreGroups.js';
import { WordFormsWdglanceAPI } from '../vendor/wdglance/wordForms.js';
import { IApiServices } from '../../appServices.js';


export interface ApiFactoryArgs {
    apiIdent:string;
    srcInfoURL:string;
    apiURL:string;
    apiServices:IApiServices;
    apiOptions:{};
}


export function createApiInstance({apiIdent, srcInfoURL, apiServices, apiURL, apiOptions}:ApiFactoryArgs):IWordFormsApi {
    switch (apiIdent) {
        case CoreApiGroup.WDGLANCE:
            return new WordFormsWdglanceAPI(apiURL, srcInfoURL, apiServices);
        case CoreApiGroup.KONTEXT:
            return new WordFormsKontextApi(apiURL, apiServices);
        case CoreApiGroup.KONTEXT_API:
            return new WordFormsKontextApi(apiURL, apiServices);
        case CoreApiGroup.MQUERY:
            return new WordFormsMqueryApi(apiURL, apiServices);
        default:
 			throw new Error(`WordForms tile API "${apiIdent}" not found. Supported values are: ${supportedCoreApiGroups().join(', ')}`);
    }
}