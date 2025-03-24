/*
 * Copyright 2025 Tomas Machalek <tomas.machalek@gmail.com>
 * Copyright 2025 Institute of the Czech National Corpus,
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

import { concatMap, Observable, of as rxOf } from 'rxjs';

import { RequestArgs, Response, SimilarFreqDbAPI } from '../abstract/similarFreq.js';
import { CoreApiGroup } from '../coreGroups.js';
import { SimilarFreqWordsAPI as SimilarFreqWordsAPIFrodo } from '../vendor/frodo/similarFreq.js';
import { SimilarFreqWordsAPI as SimilarFreqWordsAPIWDG } from '../vendor/wdglance/similarFreq.js';
import { ApiFactoryArgs } from './wordForms.js';
import { IApiServices } from '../../appServices.js';
import { HTTP } from 'cnc-tskit';


export class SimilarFreqWordsNullAPI implements SimilarFreqDbAPI {

    private readonly useDataStream:boolean;

    private readonly apiServices:IApiServices;

    constructor(useDataStream:boolean, apiServices:IApiServices) {
        this.useDataStream = useDataStream;
        this.apiServices = apiServices;
    }

    call(tileId:number, multicastRequest:boolean, args:RequestArgs):Observable<Response> {
        if (this.useDataStream) {
            return this.apiServices.dataStreaming().registerTileRequest(multicastRequest, {
                body: {},
                contentType: 'application/json',
                method: HTTP.Method.GET,
                tileId,
                url: undefined // this makes APIGuard to just return an empty value

            }).pipe(
                concatMap(
                    _ => rxOf({result: []})
                )
            )

        } else {
            return rxOf({result: []});
        }
    }
}



export function createApiInstance(
    {apiIdent, srcInfoURL, apiServices, apiURL, apiOptions, useDataStream}:ApiFactoryArgs
):SimilarFreqDbAPI {
    if (!apiURL) {
        return new SimilarFreqWordsNullAPI(useDataStream, apiServices);
    }
    switch (apiIdent) {
        case CoreApiGroup.WDGLANCE:
            return new SimilarFreqWordsAPIWDG(apiURL, apiServices);
        case CoreApiGroup.FRODO:
            return new SimilarFreqWordsAPIFrodo(apiURL, apiServices, useDataStream);
        default:
            return new SimilarFreqWordsNullAPI(useDataStream, apiServices);
    }
}