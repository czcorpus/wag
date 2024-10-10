/*
 * Copyright 2023 Martin Zimandl <martin.zimandl@gmail.com>
 * Copyright 2023 Institute of the Czech National Corpus,
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
import { Observable, map, of } from 'rxjs';

import { cachedAjax$ } from '../../../page/ajax';
import { IAsyncKeyValueStore, SourceDetails } from '../../../types';
import { IApiServices } from '../../../appServices';
import { SCollsData, SCollsExamples, SyntacticCollsModelState } from '../../../models/tiles/syntacticColls';
import { SyntacticCollsApi, SyntacticCollsExamplesApi } from '../../abstract/syntacticColls';
import { List, tuple } from 'cnc-tskit';
import { FreqRowResponse } from './common';
import { CorpusInfoAPI } from './corpusInfo';


export interface SCollsApiResponse {
    concSize:number;
    corpusSize:number;
    freqs:Array<FreqRowResponse>;
    examplesQueryTpl:string;
}


export interface SCollsRequest {
    params:{
        corpname:string;
        queryType:SCollsQueryType;
    },
    args:{
        w:string;
        pos?:string;
    }
}


// query types are mquery endpoint values
export enum SCollsQueryType {
    NOUN_MODIFIED_BY = 'noun-modified-by',
    MODIFIERS_OF = 'modifiers-of',
    VERBS_SUBJECT = 'verbs-subject',
    VERBS_OBJECT = 'verbs-object',
}
export type SCollsQueryTypeValue = `${SCollsQueryType}`;


export class MquerySyntacticCollsAPI implements SyntacticCollsApi<SCollsRequest> {

    private readonly apiURL:string;

    private readonly apiServices:IApiServices;

    private readonly cache:IAsyncKeyValueStore;

    private readonly isScollex:boolean;

    private readonly srcInfoService:CorpusInfoAPI;

    constructor(
        cache:IAsyncKeyValueStore,
        apiURL:string,
        apiServices:IApiServices,
        isScollex:boolean=false
    ) {
        this.apiURL = apiURL;
        this.apiServices = apiServices;
        this.cache = cache;
        this.isScollex = isScollex;
        this.srcInfoService = new CorpusInfoAPI(cache, apiURL, apiServices);
    }

    stateToArgs(state:SyntacticCollsModelState, queryType:SCollsQueryType):SCollsRequest {
        const args = {
            w: state.queryMatch.lemma ? state.queryMatch.lemma : state.queryMatch.word,
        };
        if (state.queryMatch.upos.length > 0) {
            args['pos'] = state.queryMatch.upos[0].value;
        }
        return {
            params: {
                corpname: state.corpname,
                queryType: queryType,
            },
            args
        };
    }

    getSourceDescription(tileId:number, lang:string, corpname:string):Observable<SourceDetails> {
        return this.srcInfoService.call({tileId, corpname, lang});
    }

    call(request:SCollsRequest):Observable<[SCollsQueryType, SCollsData]> {
        const url = this.isScollex ?
        this.apiURL + `/query/${request.params.corpname}/${request.params.queryType}` :
        this.apiURL + `/scoll/${request.params.corpname}/${request.params.queryType}`
        return cachedAjax$<SCollsApiResponse>(this.cache)(
            'GET',
            url,
            request.args,
            {
                headers: this.apiServices.getApiHeaders(this.apiURL),
                withCredentials: true
            }

        ).pipe(
            map(data => (
                tuple(
                    request.params.queryType,
                    {
                        rows: List.map(
                            row => ({
                                value: row.word,
                                freq: row.freq,
                                base: row.base,
                                ipm: row.ipm,
                                collWeight: row.collWeight,
                                coOccScore: row.coOccScore
                            }),
                            data.freqs
                        ),
                        examplesQueryTpl: data.examplesQueryTpl
                    }
                )
            )),
        );
    }

}


export interface SCERequestArgs {
    params:{
        corpname:string;
    }
    args:{
        q:string;
    }
}

export class MquerySyntacticCollsExamplesApi implements SyntacticCollsExamplesApi<SCERequestArgs> {

    private readonly apiURL:string;

    private readonly apiServices:IApiServices;

    private readonly cache:IAsyncKeyValueStore;

    constructor(cache:IAsyncKeyValueStore, apiURL:string, apiServices:IApiServices) {
        this.apiURL = apiURL;
        this.apiServices = apiServices;
        this.cache = cache;
    }

    stateToArgs(state:SyntacticCollsModelState, q:string):SCERequestArgs {
        return {
            params: {
                corpname: state.corpname,
            },
            args: {
                q
            }
        };
    }

    call(request:SCERequestArgs):Observable<SCollsExamples> {
        return cachedAjax$<SCollsExamples>(this.cache)(
            'GET',
            this.apiURL + `/conc-examples/${request.params.corpname}`,
            request.args,
            {
                headers: this.apiServices.getApiHeaders(this.apiURL),
                withCredentials: true
            }
        );
    }

}
