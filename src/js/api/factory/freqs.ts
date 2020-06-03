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

import { IAsyncKeyValueStore } from '../../types';
import { IFreqDistribAPI, IMultiBlockFreqDistribAPI } from '../abstract/freqs';
import { CoreApiGroup } from '../coreGroups';
import { KontextFreqDistribAPI, KontextMultiBlockFreqDistribAPI } from '../vendor/kontext/freqs';
import { NoskeFreqDistribAPI, NoskeMultiBlockFreqDistribAPI } from '../vendor/noske/freqs';
import { IApiServices } from '../../appServices';


export function createApiInstance(cache:IAsyncKeyValueStore, apiIdent:string, apiURL:string, apiServices:IApiServices):IFreqDistribAPI<{}> {
    switch (apiIdent) {
        case CoreApiGroup.KONTEXT:
            return new KontextFreqDistribAPI(cache, apiURL, apiServices);
        case CoreApiGroup.NOSKE:
            return new NoskeFreqDistribAPI(cache, apiURL, apiServices);
        default:
            throw new Error(`Freq API ${apiIdent} not implemented`);
    }
}


export function createMultiBlockApiInstance(cache:IAsyncKeyValueStore, apiIdent:string, apiURL:string, apiServices:IApiServices):IMultiBlockFreqDistribAPI<{}> {
    switch (apiIdent) {
        case CoreApiGroup.KONTEXT:
            return new KontextMultiBlockFreqDistribAPI(cache, apiURL, apiServices);
        case CoreApiGroup.NOSKE:
            return new NoskeMultiBlockFreqDistribAPI(cache, apiURL, apiServices);
        default:
            throw new Error(`Multi-block freq API ${apiIdent} not implemented`);
    }
}