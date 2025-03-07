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
import { DataApi } from '../../types.js';
import { IConcordanceApi } from '../abstract/concordance.js';
import { ConcApi as ConcApi015} from '../vendor/kontext/concordance/v015/index.js';
import { ConcApi as NoskeConcApi } from '../vendor/noske/concordance.js';
import { ConcApi as LCCConcApi } from '../vendor/lcc/concordance.js';
import { FCS1SearchRetrieveAPI } from '../vendor/clarin/fcs1/searchRetrieve.js';
import { FCS1ExplainAPI } from '../vendor/clarin/fcs1/explain.js';
import { CoreApiGroup, supportedCoreApiGroups } from '../coreGroups.js';
import { IApiServices, IAppServices } from '../../appServices.js';
import { ConcApiSimplified } from '../vendor/kontext/concordance/experimental/index.js';


export function createKontextConcApiInstance(apiIdent:string, apiURL:string, apiServices:IApiServices, apiOptions:{}):ConcApi015 {

	switch (apiIdent) {
		case CoreApiGroup.KONTEXT:
			return new ConcApi015(apiURL, apiServices);
	   	case CoreApiGroup.KONTEXT_API:
			return new ConcApi015(apiURL, apiServices);
		default:
			throw new Error(`Concordance Kontext API "${apiIdent}" not found. Supported values are: ${CoreApiGroup.KONTEXT} and ${CoreApiGroup.KONTEXT_API}`);
	}
}

export function createApiInstance(
	apiIdent:string,
	apiURL:string,
	useDataStream:boolean,
	apiServices:IApiServices,
	apiOptions:{}
):IConcordanceApi<{}> {

 	switch (apiIdent) {
		case CoreApiGroup.FCS_V1:
			return new FCS1SearchRetrieveAPI(apiURL, apiServices);
 		case CoreApiGroup.KONTEXT:
		case CoreApiGroup.KONTEXT_API:
			return createKontextConcApiInstance(apiIdent, apiURL, apiServices, apiOptions);
		case CoreApiGroup.KONTEXT_API_EXPERIMENTAL:
			return new ConcApiSimplified(apiURL, useDataStream, apiServices);
		case CoreApiGroup.NOSKE:
			return new NoskeConcApi(apiURL, apiServices);
		case CoreApiGroup.LCC:
			return new LCCConcApi(apiURL, apiServices);
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
