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

import { IAsyncKeyValueStore, HTTPHeaders } from '../../../common/types';
import { CoreApiGroup } from '../coreGroups';
import { DatamuseMLApi } from '../vendor/datamuse/wordSim';
import { IWordSimApi } from '../abstract/wordSim';
import { LccCoocSimApi } from '../vendor/lcc/wordSim';
import { CNCWord2VecSimApi } from '../vendor/wdglance/wordSim';


export function createApiInstance(apiIdent:string, apiURL:string, srcInfoURL:string, apiHeaders:HTTPHeaders, cache:IAsyncKeyValueStore):IWordSimApi<{}> {
	switch (apiIdent) {
		case CoreApiGroup.WDGLANCE:
			return new CNCWord2VecSimApi(cache, apiURL, srcInfoURL, apiHeaders);
        case CoreApiGroup.DATAMUSE:
			return new DatamuseMLApi(cache, apiURL, apiHeaders);
		case CoreApiGroup.LCC:
			return new LccCoocSimApi(cache, apiURL, apiHeaders);
		default:
			throw new Error(`API type "${apiIdent}" not supported for wordSim`);
	}

 }