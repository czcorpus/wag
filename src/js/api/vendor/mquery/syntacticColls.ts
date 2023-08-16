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
import { tuple } from 'cnc-tskit';


export interface SCollsFreqRowResponse {
    word:string;
    freq:number;
    norm:number;
    ipm:number;
    collWeight:number;
}


export interface SCollsApiResponse {
    concSize:number;
    corpusSize:number;
    freqs:Array<SCollsFreqRowResponse>;
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

    constructor(cache:IAsyncKeyValueStore, apiURL:string, apiServices:IApiServices) {
        this.apiURL = apiURL;
        this.apiServices = apiServices;
        this.cache = cache;
    }

    stateToArgs(state:SyntacticCollsModelState, queryType:SCollsQueryType):SCollsRequest {
        const args = {
            w: state.queryMatch.lemma,
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
        // TODO
        return of({} as SourceDetails);
    }

    call(request:SCollsRequest):Observable<[SCollsQueryType, SCollsData]> {
        return cachedAjax$<SCollsApiResponse>(this.cache)(
            'GET',
            this.apiURL + `/scoll/${request.params.corpname}/${request.params.queryType}`,
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
                        rows: data.freqs,
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
        query:string;
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

    stateToArgs(state:SyntacticCollsModelState, query:string):SCERequestArgs {
        return {
            params: {
                corpname: state.corpname,
            },
            args: {
                query
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
        )
    }

}
