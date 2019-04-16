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
import { DataApi, HTTPHeaders, SourceInfoComponent } from '../../common/types';
import { ConcResponse } from '../../common/api/abstract/concordance';
import { ConcApi, stateToArgs as concStateToArgs } from '../../common/api/kontext/concordance';
import { FCS1SearchRetrieveAPI, stateToArgs as fcsv1StateToArgs } from '../../common/api/clarin/fcs1/searchRetrieve';
import { FCS1ExplainAPI } from '../../common/api/clarin/fcs1/explain';
import { IStateArgsMapper } from '../../common/models/concordance';
import { init as fcs1Views } from '../../views/clarin/fcs1/explain';
import { ViewUtils, ActionDispatcher } from 'kombo';
import { GlobalComponents } from '../../views/global';


enum SupportedApi {
	KONTEXT = 'kontext',
	FCS_V1 = 'fcsv1'
}


function supportedApiList() {
	return Object.keys(SupportedApi).map(k => SupportedApi[k]);
}

export function createApiInstance(apiIdent:string, apiURL:string, httpHeaders?:HTTPHeaders):DataApi<{}, ConcResponse> {

 	switch (apiIdent) {
 		case SupportedApi.KONTEXT:
 			return new ConcApi(apiURL, httpHeaders);
 		case SupportedApi.FCS_V1:
 			return new FCS1SearchRetrieveAPI(apiURL, httpHeaders);
 		default:
 			throw new Error(`Concordance tile API "${apiIdent}" not found. Supported values are: ${supportedApiList().join(', ')}`);
 	}

 }


 export function createMapperInstance(apiIdent:string):IStateArgsMapper<{}> {

	switch (apiIdent) {
		case SupportedApi.KONTEXT:
			return concStateToArgs;
		case SupportedApi.FCS_V1:
			return fcsv1StateToArgs;
		default:
			throw new Error(`Concordance tile API "${apiIdent}" not found. Supported values are: ${supportedApiList().join(', ')}`);

	}
 }


 export function createSourceInfoApiInstance(apiIdent:string, apiURL:string, httpHeaders?:HTTPHeaders):DataApi<{}, {}> {

	switch (apiIdent) {
		case SupportedApi.FCS_V1:
			return new FCS1ExplainAPI(apiURL, httpHeaders);
		default:
			return null; // we leave the work for the tile model (we have slight KonText API bias here)
	}
 }


 export function createSourceInfoViewInstance(apiIdent:string, dispatcher:ActionDispatcher, viewUtils:ViewUtils<GlobalComponents>):SourceInfoComponent {

	const views = fcs1Views(dispatcher, viewUtils);

	switch (apiIdent) {
		case SupportedApi.FCS_V1:
			return views.ExplainView;
		default:
			return null;
	}

 }