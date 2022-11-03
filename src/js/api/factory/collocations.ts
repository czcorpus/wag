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

import { IAsyncKeyValueStore } from '../../types';
import { CoreApiGroup } from '../coreGroups';
import { KontextCollAPI } from '../vendor/kontext/collocations';
import { CollocationApi } from '../abstract/collocations';
import { LccCollAPI } from '../vendor/lcc/cooccurrences';
import { NoskeCollAPI } from '../vendor/noske/collocations';
import { IApiServices } from '../../appServices';
import { TokenApiWrapper } from '../vendor/kontext/tokenApiWrapper';


export function createInstance(apiIdent:string, apiURL:string, apiServices:IApiServices, cache:IAsyncKeyValueStore, apiOptions:{}):CollocationApi<{}> {

	switch (apiIdent) {
		case CoreApiGroup.KONTEXT:
            return new KontextCollAPI(cache, apiURL, apiServices);
        case CoreApiGroup.KONTEXT_API:
            return new Proxy(
				new KontextCollAPI(cache, apiURL, apiServices),
				new TokenApiWrapper(apiServices, apiURL, apiOptions["authenticateURL"]),
			);
        case CoreApiGroup.LCC:
            return new LccCollAPI(cache, apiURL, apiServices);
        case CoreApiGroup.NOSKE:
            return new NoskeCollAPI(cache, apiURL, apiServices);
		default:
			throw new Error(`API type "${apiIdent}" not supported for collocations.`);
	}

}