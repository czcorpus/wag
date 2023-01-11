/*
 * Copyright 2019 Martin Zimandl <martin.zimandl@gmail.com>
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
import { Observable } from 'rxjs';
import { map, mergeMap } from 'rxjs/operators';

import { IAsyncKeyValueStore, CorpusDetails } from '../../../types';
import { CorpusInfoAPI } from './corpusInfo';
import { ConcApi } from './concordance/v015';
import { ViewMode } from '../../abstract/concordance';
import { QueryMatch } from '../../../query';
import { HTTPResponse, SimpleKontextFreqDistribAPI, SingleCritQueryArgs } from './freqs';
import { IApiServices } from '../../../appServices';
import { Dict, List, pipe } from 'cnc-tskit';

export enum FreqSort {
    REL = 'rel'
}

export interface APIVariantsResponse {
    fcrit:string;
    fcritValues:Array<string>;
    concId:string;
}

export interface APILeafResponse {
    filter:{[attr:string]:string}
    data:Array<{name:string; value:number;}>;
    concId:string;
    corpname:string;
}


export interface BacklinkArgs {
    corpname:string;
    usesubcorp:string;
    q:string;
    fcrit:Array<string>;
    flimit:number;
    freq_sort:string;
    fpage:number;
    ftt_include_empty:number;
}


export interface WordDataApi<T, U, V> {
    call(queryArgs:T, concId:string, filter:{[attr:string]:string}):Observable<U>;
    getSourceDescription(tileId:number, lang:string, corpname:string):Observable<CorpusDetails>;
    callVariants(args:T, lemma:QueryMatch, concId: string):Observable<V>
}

export class FreqTreeAPI implements WordDataApi<SingleCritQueryArgs, APILeafResponse, APIVariantsResponse> {

    private readonly concApi:ConcApi;

    private readonly freqApi:SimpleKontextFreqDistribAPI;

    private readonly srcInfoService:CorpusInfoAPI;

    constructor(cache:IAsyncKeyValueStore, apiURL:string, apiServices:IApiServices, concApi: ConcApi, freqApi: SimpleKontextFreqDistribAPI) {
        this.concApi = concApi;
        this.freqApi = freqApi;
        this.srcInfoService = new CorpusInfoAPI(cache, apiURL, apiServices);
    }

    getSourceDescription(tileId:number, lang:string, corpname:string):Observable<CorpusDetails> {
        return this.srcInfoService.call({
            tileId: tileId,
            corpname: corpname,
            format: 'json'
        });
    }

    callVariants(args:SingleCritQueryArgs, lemma:QueryMatch, concId: string):Observable<APIVariantsResponse> {
        return this.freqApi.call({...args, q: `~${concId}`}).pipe(
            map<HTTPResponse, APIVariantsResponse>(resp => ({
                lemma: lemma,
                fcrit: args.fcrit,
                fcritValues: resp.Blocks.map(block =>
                    block.Items.map(v =>
                        v.Word.map(v => v.n).join(' ')
                    )
                ).reduce((acc,curr) => [...acc, ...curr], []),
                concId: resp.conc_persistence_op_id
            }))
        );
    }

    call(args:SingleCritQueryArgs, concId:string, filter:{[attr:string]:string}):Observable<APILeafResponse> {
        const q2 = pipe(
            filter,
            Dict.toEntries(),
            List.map(
                ([key, value]) => `<${key.split('.')[0]} ${key.split('.')[1].split(' ')[0]}="${value}"/>`
            )
        ).join(' & ');
        return this.concApi.call({
            type: 'quickFilterQueryArgs',
            corpname: args.corpname,
            q: `~${concId}`,
            q2: `p0 0 1 [] within ${q2}`,
            pagesize: '0',
            fromp: '1',
            attr_vmode: 'mouseover',
            attrs: 'word',
            viewmode: ViewMode.KWIC,
            shuffle: 0,
            kwicleftctx: '-1',
            kwicrightctx: '1',
            format:'json'
        }).pipe(mergeMap(x =>
            this.freqApi.call({...args, q: `~${x.concPersistenceID}`}).pipe(
                map<HTTPResponse, APILeafResponse>(
                    resp => ({
                        filter: filter,
                        data: resp.Blocks.map(block =>
                            block.Items.map(v => ({
                                name: v.Word.map(v => v.n).join(' '),
                                value: v.rel
                            }))
                        ).reduce((acc,curr) => [...acc, ...curr], []),
                        concId: resp.conc_persistence_op_id,
                        corpname: args.corpname
                    })
                )
            )
        ))
    }
}