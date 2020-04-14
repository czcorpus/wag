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

import { TimeDistribApi, TimeDistribArgs, TimeDistribResponse } from '../abstract/timeDistrib';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { FreqSort, KontextFreqDistribAPI } from './freqs';
import { HTTPHeaders, IAsyncKeyValueStore, CorpusDetails } from '../../types';
import { CorpusInfoAPI } from './corpusInfo';
import { IFreqDistribAPI } from '../abstract/freqs';
import { Backlink, BacklinkWithArgs } from '../../tile';
import { HTTP } from 'cnc-tskit';


interface BacklinkArgs {
    corpname:string;
    usesubcorp:string;
    q?:string;
    cql?:string;
    queryselector?:'cqlrow';
}

/**
 * This is the main TimeDistrib API for KonText. It should work in any
 * case.
 */
export class KontextTimeDistribApi implements TimeDistribApi {

    private readonly freqApi:IFreqDistribAPI<{}>;

    private readonly fcrit:string;

    private readonly flimit:number;

    private readonly srcInfoService:CorpusInfoAPI;

    constructor(cache:IAsyncKeyValueStore, apiURL:string, customHeaders:HTTPHeaders, fcrit:string, flimit:number) {
        this.freqApi = new KontextFreqDistribAPI(cache, apiURL, customHeaders);
        this.fcrit = fcrit;
        this.flimit = flimit;
        this.srcInfoService = new CorpusInfoAPI(cache, apiURL, customHeaders);
    }

    getSourceDescription(tileId:number, uiLang:string, corpname:string):Observable<CorpusDetails> {
        return this.srcInfoService.call({
            tileId: tileId,
            corpname: corpname,
            format: 'json'
        });
    }

    createBackLink(backlink:Backlink, corpname:string, concId:string, origQuery:string):BacklinkWithArgs<BacklinkArgs> {
        console.log(backlink, corpname, concId, origQuery);
        
        return backlink ?
            {
                url: backlink.url,
                method: backlink.method || HTTP.Method.GET,
                label: backlink.label,
                args: origQuery ?
                    {
                        corpname: corpname,
                        usesubcorp: backlink.subcname,
                        cql: origQuery,
                        queryselector: 'cqlrow'
                    } :
                    {
                        corpname: corpname,
                        usesubcorp: backlink.subcname,
                        q: `~${concId}`
                    }
            } :
            null;
    }

    call(queryArgs:TimeDistribArgs):Observable<TimeDistribResponse> {
        return this.freqApi.call({
            corpname: queryArgs.corpName,
            usesubcorp: queryArgs.subcorpName,
            q: `~${queryArgs.concIdent}`,
            fcrit: this.fcrit,
            flimit: this.flimit,
            freq_sort: FreqSort.REL,
            fpage: 1,
            ftt_include_empty: 0,
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
