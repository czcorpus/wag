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
import { IAudioUrlGenerator } from '../abstract/audio.js';
import { KontextAudioLinkGenerator } from '../vendor/kontext/audio.js';
import { SpeechesApi } from '../vendor/kontext/speeches.js';
import { IAsyncKeyValueStore } from '../../types.js';
import { IApiServices } from '../../appServices.js';

export function createSpeechesApiInstance(cache:IAsyncKeyValueStore, apiIdent:string, apiURL:string, apiServices:IApiServices, apiOptions:{}):SpeechesApi {

	switch (apiIdent) {
		case CoreApiGroup.KONTEXT:
			return new SpeechesApi(cache, apiURL, apiServices);
		case CoreApiGroup.KONTEXT_API:
			return new SpeechesApi(cache, apiURL, apiServices);
		default:
			throw new Error(`API type "${apiIdent}" not supported for speeches.`);
	}
}

export function createAudioUrlGeneratorInstance(apiIdent:string, rootUrl:string):IAudioUrlGenerator {

	switch (apiIdent) {
		case CoreApiGroup.KONTEXT:
		case CoreApiGroup.KONTEXT_API:
			return new KontextAudioLinkGenerator(rootUrl);
		default:
			return null;
	}
}