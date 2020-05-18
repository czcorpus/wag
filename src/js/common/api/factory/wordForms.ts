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

import { IWordFormsApi } from '../../../common/api/abstract/wordForms';
import { WordFormsAPI as WordFormsKontextApi } from '../../../common/api/kontext/wordForms';
import { HTTPHeaders, IAsyncKeyValueStore } from '../../../common/types';
import { CoreApiGroup, supportedCoreApiGroups } from '../../../common/api/coreGroups';
import { WordFormsWdglanceAPI } from '../../../common/api/wdglance/wordForms';


export function createApiInstance(apiIdent:string, cache:IAsyncKeyValueStore, apiURL:string, httpHeaders?:HTTPHeaders):IWordFormsApi {
    switch (apiIdent) {
        case CoreApiGroup.WDGLANCE:
            return new WordFormsWdglanceAPI(cache, apiURL);
        case CoreApiGroup.KONTEXT:
            return new WordFormsKontextApi(cache, apiURL, httpHeaders);
        default:
 			throw new Error(`WordForms tile API "${apiIdent}" not found. Supported values are: ${supportedCoreApiGroups().join(', ')}`);
    }
}