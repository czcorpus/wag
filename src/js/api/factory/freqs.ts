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

import { IFreqDistribAPI, IMultiBlockFreqDistribAPI } from '../abstract/freqs.js';
import { CoreApiGroup } from '../coreGroups.js';
import { KontextFreqDistribAPI, KontextMultiBlockFreqDistribAPI, SimpleKontextFreqDistribAPI } from '../vendor/kontext/freqs.js';
import { NoskeFreqDistribAPI, NoskeMultiBlockFreqDistribAPI } from '../vendor/noske/freqs.js';
import { IApiServices } from '../../appServices.js';
import { MQueryFreqDistribAPI } from '../vendor/mquery/freqs.js';


export function createSimpleFreqApiInstance(apiIdent:string, apiURL:string, apiServices:IApiServices, apiOptions:{}):SimpleKontextFreqDistribAPI {
    switch (apiIdent) {
        case CoreApiGroup.KONTEXT:
            return new SimpleKontextFreqDistribAPI(apiURL, apiServices);
        case CoreApiGroup.KONTEXT_API:
            return new SimpleKontextFreqDistribAPI(apiURL, apiServices);
        default:
            throw new Error(`Simple freq API ${apiIdent} not implemented`);
    }
}


export function createApiInstance(apiIdent:string, apiURL:string, useDataStream:boolean, apiServices:IApiServices, apiOptions:{}):IFreqDistribAPI<{}> {
    switch (apiIdent) {
        case CoreApiGroup.KONTEXT:
            return new KontextFreqDistribAPI(apiURL, apiServices);
        case CoreApiGroup.KONTEXT_API:
            return new KontextFreqDistribAPI(apiURL, apiServices);
        case CoreApiGroup.NOSKE:
            return new NoskeFreqDistribAPI(apiURL, apiServices);
        case CoreApiGroup.MQUERY:
            return new MQueryFreqDistribAPI(apiURL, apiServices, useDataStream);
        default:
            throw new Error(`Freq API ${apiIdent} not implemented`);
    }
}


export function createMultiBlockApiInstance(apiIdent:string, apiURL:string, apiServices:IApiServices, apiOptions:{}):IMultiBlockFreqDistribAPI<{}> {
    switch (apiIdent) {
        case CoreApiGroup.KONTEXT:
            return new KontextMultiBlockFreqDistribAPI(apiURL, apiServices);
        case CoreApiGroup.KONTEXT_API:
            return new KontextMultiBlockFreqDistribAPI(apiURL, apiServices);
        case CoreApiGroup.NOSKE:
            return new NoskeMultiBlockFreqDistribAPI(apiURL, apiServices);
        default:
            throw new Error(`Multi-block freq API ${apiIdent} not implemented`);
    }
}