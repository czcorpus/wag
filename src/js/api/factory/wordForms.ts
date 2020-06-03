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

import { IWordFormsApi } from '../abstract/wordForms';
import { WordFormsAPI as WordFormsKontextApi } from '../vendor/kontext/wordForms';
import { HTTPHeaders, IAsyncKeyValueStore } from '../../types';
import { CoreApiGroup, supportedCoreApiGroups } from '../coreGroups';
import { WordFormsWdglanceAPI } from '../vendor/wdglance/wordForms';
import { IApiServices } from '../../appServices';


export interface ApiFactoryArgs {
    apiIdent:string;
    cache:IAsyncKeyValueStore;
    srcInfoURL:string;
    apiURL:string;
    apiServices:IApiServices;
}


export function createApiInstance({apiIdent, cache, srcInfoURL, apiServices, apiURL}:ApiFactoryArgs):IWordFormsApi {
    switch (apiIdent) {
        case CoreApiGroup.WDGLANCE:
            return new WordFormsWdglanceAPI(cache, apiURL, srcInfoURL, apiServices);
        case CoreApiGroup.KONTEXT:
            return new WordFormsKontextApi(cache, apiURL, apiServices);
        default:
 			throw new Error(`WordForms tile API "${apiIdent}" not found. Supported values are: ${supportedCoreApiGroups().join(', ')}`);
    }
}