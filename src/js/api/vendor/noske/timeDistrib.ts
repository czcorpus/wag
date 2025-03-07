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

import { CustomArgs, TimeDistribApi, TimeDistribArgs, TimeDistribResponse } from '../../abstract/timeDistrib.js';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { NoskeFreqDistribAPI } from './freqs.js';
import { CorpusDetails } from '../../../types.js';
import { CorpusInfoAPI } from './corpusInfo.js';
import { IFreqDistribAPI } from '../../abstract/freqs.js';
import { processConcId } from './common.js';
import { Backlink, BacklinkWithArgs } from '../../../page/tile.js';
import { HTTP } from 'cnc-tskit';
import { IApiServices } from '../../../appServices.js';


interface BacklinkArgs {
    corpname:string;
    usesubcorp:string;
    q:string[];
}

/**
 * This is the main TimeDistrib API for NoSke engine. It should work in any
 * case.
 */
export class NoskeTimeDistribApi implements TimeDistribApi {

    private readonly freqApi:IFreqDistribAPI<{}>;

    private readonly customArgs:CustomArgs;

    private readonly srcInfoService:CorpusInfoAPI;

    constructor(apiURL:string, apiServices:IApiServices, customArgs:CustomArgs) {
        this.freqApi = new NoskeFreqDistribAPI(apiURL, apiServices);
        this.customArgs = customArgs;
        this.srcInfoService = new CorpusInfoAPI(apiURL, apiServices);
    }

    getSourceDescription(tileId:number, lang:string, corpname:string):Observable<CorpusDetails> {
        return this.srcInfoService.call(tileId, {
            corpname: corpname,
            struct_attr_stats: 1,
            subcorpora: 1,
            format: 'json',
        });
    }

    createBackLink(backlink:Backlink, corpname:string, concId:string, origQuery:string):BacklinkWithArgs<BacklinkArgs> {
        return backlink ?
            {
                url: backlink.url,
                method: backlink.method || HTTP.Method.GET,
                label: backlink.label,
                args: {
                    corpname: corpname,
                    usesubcorp: backlink.subcname,
                    q: processConcId(concId)
                }
            } :
            null;
    }

    call(tileId:number, queryArgs:TimeDistribArgs):Observable<TimeDistribResponse> {

        return this.freqApi.call(tileId, {
            corpname: queryArgs.corpName,
            usesubcorp: queryArgs.subcorpName,
            q: processConcId(queryArgs.concIdent),
            fcrit: this.customArgs['fcrit'],
            flimit: this.customArgs['flimit'],
            freq_sort: 'rel',
            fpage: 1,
            format: 'json'
        }).pipe(
            map(
                (response) => ({
                    corpName: queryArgs.corpName,
                    subcorpName: queryArgs.subcorpName,
                    concPersistenceID: queryArgs.concIdent,
                    data: response.data.map(v => ({
                            datetime: v.name,
                            freq: v.freq,
                            norm: v.norm
                    }))
                })
            )
        );
    }
}
