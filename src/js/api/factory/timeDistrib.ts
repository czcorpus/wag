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

import { KontextTimeDistribApi } from '../vendor/kontext/timeDistrib';
import { CoreApiGroup, supportedCoreApiGroups } from '../coreGroups';
import { IAsyncKeyValueStore } from '../../types';
import { NoskeTimeDistribApi } from '../vendor/noske/timeDistrib';
import { CustomArgs, TimeDistribApi } from '../abstract/timeDistrib';
import { IApiServices } from '../../appServices';
import { MQueryTimeDistribStreamApi } from '../vendor/mquery/timeDistrib';

export function createApiInstance(
	apiIdent:string,
	cache:IAsyncKeyValueStore,
	apiURL:string,
	apiServices:IApiServices,
	conf:CustomArgs,
	apiOptions:{}
):TimeDistribApi {

	switch (apiIdent) {
		case CoreApiGroup.KONTEXT:
			return new KontextTimeDistribApi(
				cache,
				apiURL,
				apiServices,
                conf
			);
		case CoreApiGroup.KONTEXT_API:
			return new KontextTimeDistribApi(
				cache,
				apiURL,
				apiServices,
                conf
			);
		case CoreApiGroup.NOSKE:
			return new NoskeTimeDistribApi(
				cache,
				apiURL,
				apiServices,
				conf
			);
		case CoreApiGroup.MQUERY:
			return new MQueryTimeDistribStreamApi(
				cache,
				apiURL,
				apiServices,
                conf
			);
		default:
			throw new Error(`TimeDistrib API "${apiIdent}" not found. Supported values are: ${supportedCoreApiGroups().join(', ')}`);
	}

}