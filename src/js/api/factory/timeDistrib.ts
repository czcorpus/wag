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

import { KontextTimeDistribApi } from '../vendor/kontext/timeDistrib.js';
import { CoreApiGroup, supportedCoreApiGroups } from '../coreGroups.js';
import { NoskeTimeDistribApi } from '../vendor/noske/timeDistrib.js';
import { CustomArgs, TimeDistribApi } from '../abstract/timeDistrib.js';
import { IApiServices } from '../../appServices.js';
import { MQueryTimeDistribStreamApi } from '../vendor/mquery/timeDistrib.js';

export function createApiInstance(
	apiIdent:string,
	apiURL:string,
	useDataStream:boolean,
	apiServices:IApiServices,
	conf:CustomArgs,
	apiOptions:{}
):TimeDistribApi {

	switch (apiIdent) {
		case CoreApiGroup.KONTEXT:
			return new KontextTimeDistribApi(
				apiURL,
				apiServices,
                conf
			);
		case CoreApiGroup.KONTEXT_API:
			return new KontextTimeDistribApi(
				apiURL,
				apiServices,
                conf
			);
		case CoreApiGroup.NOSKE:
			return new NoskeTimeDistribApi(
				apiURL,
				apiServices,
				conf
			);
		case CoreApiGroup.MQUERY:
			return new MQueryTimeDistribStreamApi(
				apiURL,
				useDataStream,
				apiServices,
                conf
			);
		default:
			throw new Error(`TimeDistrib API "${apiIdent}" not found. Supported values are: ${supportedCoreApiGroups().join(', ')}`);
	}

}