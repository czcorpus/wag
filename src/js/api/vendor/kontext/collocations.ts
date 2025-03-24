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
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { HTTP, Ident } from 'cnc-tskit';

import { ajax$ } from '../../../page/ajax.js';
import { SourceDetails, WebDelegateApi } from '../../../types.js';
import { CollApiResponse, CollocationApi } from '../../abstract/collocations.js';
import { CollocModelState, ctxToRange } from '../../../models/tiles/collocations.js';
import { CorpusInfoAPI } from './corpusInfo.js';
import { IApiServices } from '../../../appServices.js';
import { Backlink } from '../../../page/tile.js';
import { QueryMatch } from '../../../query/index.js';



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
    conc_persistence_op_id:string;
    Head:ResponseDataHeading;
    Items:Array<ResponseDataRow>;
}


export interface CoreCollRequestArgs {
    corpname:string;
    q:string;
    cattr:string;
    cfromw:number;
    ctow:number;
    cminfreq:number;
    cminbgr:number;
    cbgrfns:Array<string>;
    csortfn:string;
    citemsperpage:number;
}

export interface CollApiArgs extends CoreCollRequestArgs {
    format:'json';
}


export class KontextCollAPI implements CollocationApi<CollApiArgs>, WebDelegateApi {
    API_PATH = '/collx'

    private readonly apiURL:string;

    private readonly apiServices:IApiServices;

    private readonly srcInfoService:CorpusInfoAPI;

    constructor(apiURL:string, apiServices:IApiServices) {
        this.apiURL = apiURL;
        this.apiServices = apiServices;
        this.srcInfoService = new CorpusInfoAPI(apiURL, apiServices);
    }

    stateToArgs(state:CollocModelState, queryMatch:QueryMatch, concId:string):CollApiArgs {
        const [cfromw, ctow] = ctxToRange(state.srchRangeType, state.srchRange);
        return {
            corpname: state.corpname,
            q: `~${concId}`,
            cattr: state.tokenAttr,
            cfromw: cfromw,
            ctow: ctow,
            cminfreq: state.minAbsFreq,
            cminbgr: state.minLocalAbsFreq,
            cbgrfns: state.appliedMetrics,
            csortfn: state.sortByMetric,
            citemsperpage: state.citemsperpage,
            format: 'json'
        };
    }

    supportsLeftRightContext():boolean {
        return true;
    }

    supportsMultiWordQueries():boolean {
        return true;
    }

    getSourceDescription(tileId:number, lang:string, corpname:string):Observable<SourceDetails> {
        return this.srcInfoService.call(tileId, {
            corpname: corpname,
            format: 'json'
        });
    }

    call(tileId:number, queryArgs:CollApiArgs):Observable<CollApiResponse> {
        const headers = this.apiServices.getApiHeaders(this.apiURL);
        headers['X-Is-Web-App'] = '1';
        return ajax$<HttpApiResponse>(
            'GET',
            this.apiURL + this.API_PATH,
            queryArgs,
            {
                headers,
                withCredentials: true
            }

        ).pipe(
            map(
                data => ({
                    concId: data.conc_persistence_op_id,
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

    getBackLink(backlink:Backlink):Backlink {
        return {
            label: 'KonText',
            method: HTTP.Method.GET,
            ...(backlink || {}),
            url: (backlink?.url ? backlink.url : this.apiURL) + this.API_PATH,
        }
    }
}

