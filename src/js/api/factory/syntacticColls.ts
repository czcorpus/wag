/*
 * Copyright 2023 Martin Zimandl <martin.zimandl@gmail.com>
 * Copyright 2023 Institute of the Czech National Corpus,
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
import { IApiServices } from '../../appServices';
import { MquerySyntacticCollsAPI, MquerySyntacticCollsExamplesApi } from '../vendor/mquery/syntacticColls';
import { SyntacticCollsApi, SyntacticCollsExamplesApi } from '../abstract/syntacticColls';
import { tuple } from 'cnc-tskit';


export function createInstance(
	apiIdent:string,
	apiURL:string,
	apiServices:IApiServices,
	cache:IAsyncKeyValueStore,
	apiOptions:{}
):[SyntacticCollsApi<any>, SyntacticCollsExamplesApi<any>] {

	switch (apiIdent) {
		case CoreApiGroup.MQUERY:
            return tuple(
				new MquerySyntacticCollsAPI(cache, apiURL, apiServices),
				new MquerySyntacticCollsExamplesApi(cache, apiURL, apiServices)
			);
		case CoreApiGroup.SCOLLEX:
			return tuple(
				new MquerySyntacticCollsAPI(cache, apiURL, apiServices, true),
				new MquerySyntacticCollsExamplesApi(cache, apiURL, apiServices)
			);
		default:
			throw new Error(`API type "${apiIdent}" not supported for syntactic collocations.`);
	}

}