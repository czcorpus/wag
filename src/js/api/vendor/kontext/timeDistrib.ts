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

import { TimeDistribApi, TimeDistribArgs, TimeDistribResponse } from '../../abstract/timeDistrib';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { FreqSort, KontextFreqDistribAPI, BacklinkArgs as FreqBacklinkArgs } from './freqs';
import { IAsyncKeyValueStore, CorpusDetails, WebDelegateApi } from '../../../types';
import { CorpusInfoAPI } from './corpusInfo';
import { Backlink, BacklinkWithArgs } from '../../../page/tile';
import { HTTP } from 'cnc-tskit';
import { IApiServices } from '../../../appServices';


interface BacklinkArgs {
    corpname:string;
    usesubcorp:string;
    cql:string;
    queryselector:'cqlrow';
}

/**
 * This is the main TimeDistrib API for KonText. It should work in any
 * case.
 */
export class KontextTimeDistribApi implements TimeDistribApi, WebDelegateApi {

    private readonly freqApi:KontextFreqDistribAPI;

    private readonly fcrit:string;

    private readonly flimit:number;

    private readonly srcInfoService:CorpusInfoAPI;

    constructor(cache:IAsyncKeyValueStore, apiURL:string, apiServices:IApiServices, fcrit:string, flimit:number) {
        this.freqApi = new KontextFreqDistribAPI(cache, apiURL, apiServices);
        this.fcrit = fcrit;
        this.flimit = flimit;
        this.srcInfoService = new CorpusInfoAPI(cache, apiURL, apiServices);
    }

    getSourceDescription(tileId:number, lang:string, corpname:string):Observable<CorpusDetails> {
        return this.srcInfoService.call({
            tileId: tileId,
            corpname: corpname,
            format: 'json'
        });
    }

    createBackLink(backlink:Backlink, corpname:string, concId:string, origQuery:string):BacklinkWithArgs<BacklinkArgs|FreqBacklinkArgs> {
        if (backlink === null) {
            return null;
        }

        if (origQuery) {
            return {
                url: backlink.url,
                method: backlink.method || HTTP.Method.GET,
                label: backlink.label,
                args: {
                    corpname: corpname,
                    usesubcorp: backlink.subcname,
                    cql: origQuery,
                    queryselector: 'cqlrow'
                }
            }
        }

        return {
            url: backlink.url,
            method: backlink.method || HTTP.Method.GET,
            label: backlink.label,
            args: {
                corpname: corpname,
                usesubcorp: backlink.subcname,
                q: `~${concId}`,
                fcrit: [this.fcrit],
                freq_type: 'text-types',
                flimit: this.flimit,
                freq_sort: FreqSort.REL,
                fpage: 1,
                ftt_include_empty: 0
            }
        }
    }

    call(queryArgs:TimeDistribArgs):Observable<TimeDistribResponse> {
        return this.freqApi.call({
            corpname: queryArgs.corpName,
            usesubcorp: queryArgs.subcorpName,
            q: `~${queryArgs.concIdent}`,
            fcrit: this.fcrit,
            freq_type: 'text-types',
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

    getBackLink(backlink:Backlink):Backlink {
        return this.freqApi.getBackLink(backlink)
    }
}
