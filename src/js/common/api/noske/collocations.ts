/*
 * Copyright 2020 Tomas Machalek <tomas.machalek@gmail.com>
 * Copyright 2020 Institute of the Czech National Corpus,
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
import { map } from 'rxjs/operators';
import { Ident, pipe, List } from 'cnc-tskit';

import { cachedAjax$ } from '../../../common/ajax';
import { HTTPHeaders, IAsyncKeyValueStore, SourceDetails } from '../../../common/types';
import { CollApiResponse, CollocationApi } from '../abstract/collocations';
import { CollocModelState, ctxToRange } from '../../models/collocations';
import { CorpusInfoAPI } from './corpusInfo';



type ResponseDataHeading = Array<{
    s:string;
    n:string;
}>;

interface ResponseDataRow {
    Stats:Array<{s:string}>;
    freq:number;
    nfilter:[string, string];
    pfilter:[string, string];
    str:string;
}


interface HttpApiResponse {
    request:{q:string;};
    Head:ResponseDataHeading;
    Items:Array<ResponseDataRow>;
}


export interface CoreCollRequestArgs {
    corpname:string;
    q:Array<string>;
    cattr:string;
    cfromw:number;
    ctow:number;
    cminfreq:number;
    cminbgr:number;
    cmaxitems:number;
    cbgrfns:Array<string>;
    csortfn:string;
}

export interface CollApiArgs extends CoreCollRequestArgs {
    format:'json';
}


export class NoskeCollAPI implements CollocationApi<CollApiArgs> {

    private readonly apiURL:string;

    private readonly customHeaders:HTTPHeaders;

    private readonly cache:IAsyncKeyValueStore;

    private readonly srcInfoService:CorpusInfoAPI;

    constructor(cache:IAsyncKeyValueStore, apiURL:string, customHeaders?:HTTPHeaders) {
        this.apiURL = apiURL;
        this.customHeaders = customHeaders || {};
        this.cache = cache;
        this.srcInfoService = new CorpusInfoAPI(cache, apiURL, customHeaders);
    }

    stateToArgs(state:CollocModelState, concId:string):CollApiArgs {
        const [cfromw, ctow] = ctxToRange(state.srchRangeType, state.srchRange);
        return {
            corpname: state.corpname,
            q: pipe(
                concId.split('&'),
                List.map(v => v.split('=').slice(0, 2)),
                List.filter(([k, v]) => k === 'q'),
                List.map(([,v]) => decodeURIComponent(v.replace(/\++/g, ' ')))
            ),
            cattr: state.tokenAttr,
            cfromw: cfromw,
            ctow: ctow,
            cminfreq: state.minAbsFreq,
            cminbgr: state.minLocalAbsFreq,
            cbgrfns: state.appliedMetrics,
            csortfn: state.sortByMetric,
            cmaxitems: state.citemsperpage,
            format: 'json'
        };
    }

    supportsLeftRightContext():boolean {
        return true;
    }

    supportsMultiWordQueries():boolean {
        return true;
    }

    getSourceDescription(tileId:number, uiLang:string, corpname:string):Observable<SourceDetails> {
        return this.srcInfoService.call({
            tileId: tileId,
            corpname: corpname,
            struct_attr_stats: 1,
            subcorpora: 1,
            format: 'json',
        });
    }

    call(queryArgs:CollApiArgs):Observable<CollApiResponse> {
        return cachedAjax$<HttpApiResponse>(this.cache)(
            'GET',
            this.apiURL + '/collx',
            queryArgs,
            {headers: this.customHeaders}

        ).pipe(
            map(
                data => ({
                    concId: data.request.q,
                    collHeadings: data.Head.map(v => ({label: v.n, ident: v.s})),
                    data: data.Items.map(item => ({
                        stats: item.Stats.map(v => parseFloat(v.s)),
                        freq: item.freq,
                        pfilter: item.pfilter,
                        nfilter: item.nfilter,
                        str: item.str,
                        interactionId: Ident.puid()
                    }))
                })
            )
        );
    }

}

