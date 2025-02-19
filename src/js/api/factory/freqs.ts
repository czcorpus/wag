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

import { IAsyncKeyValueStore } from '../../types.js';
import { IFreqDistribAPI, IMultiBlockFreqDistribAPI } from '../abstract/freqs.js';
import { CoreApiGroup } from '../coreGroups.js';
import { KontextFreqDistribAPI, KontextMultiBlockFreqDistribAPI, SimpleKontextFreqDistribAPI } from '../vendor/kontext/freqs.js';
import { NoskeFreqDistribAPI, NoskeMultiBlockFreqDistribAPI } from '../vendor/noske/freqs.js';
import { IApiServices } from '../../appServices.js';
import { MQueryFreqDistribAPI } from '../vendor/mquery/freqs.js';


export function createSimpleFreqApiInstance(cache:IAsyncKeyValueStore, apiIdent:string, apiURL:string, apiServices:IApiServices, apiOptions:{}):SimpleKontextFreqDistribAPI {
    switch (apiIdent) {
        case CoreApiGroup.KONTEXT:
            return new SimpleKontextFreqDistribAPI(cache, apiURL, apiServices);
        case CoreApiGroup.KONTEXT_API:
            return new SimpleKontextFreqDistribAPI(cache, apiURL, apiServices);
        default:
            throw new Error(`Simple freq API ${apiIdent} not implemented`);
    }
}


export function createApiInstance(cache:IAsyncKeyValueStore, apiIdent:string, apiURL:string, apiServices:IApiServices, apiOptions:{}):IFreqDistribAPI<{}> {
    switch (apiIdent) {
        case CoreApiGroup.KONTEXT:
            return new KontextFreqDistribAPI(cache, apiURL, apiServices);
        case CoreApiGroup.KONTEXT_API:
            return new KontextFreqDistribAPI(cache, apiURL, apiServices);
        case CoreApiGroup.NOSKE:
            return new NoskeFreqDistribAPI(cache, apiURL, apiServices);
        case CoreApiGroup.MQUERY:
            return new MQueryFreqDistribAPI(cache, apiURL, apiServices);
        default:
            throw new Error(`Freq API ${apiIdent} not implemented`);
    }
}


export function createMultiBlockApiInstance(cache:IAsyncKeyValueStore, apiIdent:string, apiURL:string, apiServices:IApiServices, apiOptions:{}):IMultiBlockFreqDistribAPI<{}> {
    switch (apiIdent) {
        case CoreApiGroup.KONTEXT:
            return new KontextMultiBlockFreqDistribAPI(cache, apiURL, apiServices);
        case CoreApiGroup.KONTEXT_API:
            return new KontextMultiBlockFreqDistribAPI(cache, apiURL, apiServices);
        case CoreApiGroup.NOSKE:
            return new NoskeMultiBlockFreqDistribAPI(cache, apiURL, apiServices);
        default:
            throw new Error(`Multi-block freq API ${apiIdent} not implemented`);
    }
}