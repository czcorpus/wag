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
import { DataApi, IAsyncKeyValueStore } from '../../types';
import { IConcordanceApi } from '../abstract/concordance';
import { ConcApi } from '../vendor/kontext/concordance';
import { ConcApi as NoskeConcApi } from '../vendor/noske/concordance';
import { ConcApi as LCCConcApi } from '../vendor/lcc/concordance';
import { FCS1SearchRetrieveAPI } from '../vendor/clarin/fcs1/searchRetrieve';
import { FCS1ExplainAPI } from '../vendor/clarin/fcs1/explain';
import { CoreApiGroup, supportedCoreApiGroups } from '../coreGroups';
import { IApiServices, IAppServices } from '../../appServices';


export function createApiInstance(cache:IAsyncKeyValueStore, apiIdent:string, apiURL:string, apiServices:IApiServices):IConcordanceApi<{}> {

 	switch (apiIdent) {
		case CoreApiGroup.FCS_V1:
			return new FCS1SearchRetrieveAPI(apiURL, apiServices);
 		case CoreApiGroup.KONTEXT:
 			return new ConcApi(false, cache, apiURL, apiServices);
		case CoreApiGroup.NOSKE:
			return new NoskeConcApi(cache, apiURL, apiServices);
		case CoreApiGroup.LCC:
			return new LCCConcApi(cache, apiURL, apiServices);
 		default:
 			throw new Error(`Concordance tile API "${apiIdent}" not found. Supported values are: ${supportedCoreApiGroups().join(', ')}`);
 	}
 }


 export function createSourceInfoApiInstance(apiIdent:string, apiURL:string, apiServices:IAppServices):DataApi<{}, {}> {

	switch (apiIdent) {
		case CoreApiGroup.FCS_V1:
			return new FCS1ExplainAPI(apiURL, apiServices);
		default:
			return null; // we leave the work for the tile model (we have slight KonText API bias here)
	}
 }
