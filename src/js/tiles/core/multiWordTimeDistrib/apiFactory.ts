/*
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

import { KontextTimeDistribApi } from '../../../common/api/kontext/timeDistrib';
import { TimeDistTileConf } from './common';
import { CoreApiGroup, supportedCoreApiGroups } from '../../../common/api/coreGroups';
import { HTTPHeaders, IAsyncKeyValueStore } from '../../../common/types';

export function createApiInstance(apiIdent:string, cache:IAsyncKeyValueStore, apiURL:string, conf:TimeDistTileConf, httpHeaders?:HTTPHeaders):KontextTimeDistribApi {

	switch (apiIdent) {
		case CoreApiGroup.KONTEXT:
			return new KontextTimeDistribApi(
				cache,
                apiURL,
                httpHeaders,
                conf.fcrit,
                conf.flimit
            );
		default:
			throw new Error(`TimeDistrib tile API "${apiIdent}" not found. Supported values are: ${supportedCoreApiGroups().join(', ')}`);
	}

}