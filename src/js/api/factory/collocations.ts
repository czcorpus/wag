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

import { CoreApiGroup } from '../coreGroups.js';
import { KontextCollAPI } from '../vendor/kontext/collocations.js';
import { CollocationApi } from '../abstract/collocations.js';
import { LccCollAPI } from '../vendor/lcc/cooccurrences.js';
import { NoskeCollAPI } from '../vendor/noske/collocations.js';
import { IApiServices } from '../../appServices.js';
import { MQueryCollAPI } from '../vendor/mquery/colls.js';


export function createInstance(
    apiIdent:string,
    apiURL:string,
    useDataStream:boolean,
    apiServices:IApiServices,
    apiOptions:{}
):CollocationApi<{}> {

	switch (apiIdent) {
		case CoreApiGroup.KONTEXT:
            return new KontextCollAPI(apiURL, apiServices);
        case CoreApiGroup.KONTEXT_API:
			return new KontextCollAPI(apiURL, apiServices);
        case CoreApiGroup.LCC:
            return new LccCollAPI(apiURL, apiServices);
        case CoreApiGroup.MQUERY:
            return new MQueryCollAPI(apiURL, useDataStream, apiServices);
        case CoreApiGroup.NOSKE:
            return new NoskeCollAPI(apiURL, apiServices);
		default:
			throw new Error(`API type "${apiIdent}" not supported for collocations.`);
	}

}