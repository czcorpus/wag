/**
* Copyright 2018 Institute of the Czech National Corpus,
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
import { MatchingDocsModelState, KontextFreqBacklinkArgs } from '../../../models/tiles/matchingDocs';
import { MatchingDocsAPI, APIResponse } from '../../abstract/matchingDocs';
import { cachedAjax$ } from '../../../page/ajax';
import { Observable } from 'rxjs';
import { IAsyncKeyValueStore, CorpusDetails } from '../../../types';
import { HTTP, List } from 'cnc-tskit';
import { map, mergeMap } from 'rxjs/operators';
import { SingleCritQueryArgs, HTTPResponse, SimpleKontextFreqDistribAPI } from './freqs';
import { CorpusInfoAPI } from './corpusInfo';
import { BacklinkWithArgs } from '../../../page/tile';
import { IApiServices } from '../../../appServices';


export interface KontextMatchingDocsQueryArgs extends SingleCritQueryArgs {
    searchAttrs:Array<string>;
    displayAttrs:Array<string>;
}


export class KontextMatchingDocsAPI implements MatchingDocsAPI<KontextMatchingDocsQueryArgs> {

    protected readonly apiURL:string;

    protected readonly apiServices:IApiServices;

    protected readonly cache:IAsyncKeyValueStore;

    protected readonly srcInfoService:CorpusInfoAPI;

    protected readonly freqApi:SimpleKontextFreqDistribAPI;

    constructor(cache:IAsyncKeyValueStore, apiURL:string, apiServices:IApiServices, freqApi: SimpleKontextFreqDistribAPI) {
        this.cache = cache;
        this.apiURL = apiURL;
        this.apiServices = apiServices;
        this.srcInfoService = new CorpusInfoAPI(cache, apiURL, apiServices);
        this.freqApi = freqApi;
    }

    stateToBacklink(state:MatchingDocsModelState, query:string):BacklinkWithArgs<KontextFreqBacklinkArgs> {
        return {
            url: this.apiURL,
			label: "frekv. distribuce v KonTextu",
			method: HTTP.Method.GET,
            args: {
                corpname: state.corpname,
                usesubcorp: state.subcname,
                q: `~${query}`,
                fcrit: [state.searchAttrs[0]],
                flimit: state.minFreq,
                freq_sort: "rel",
                fpage: 1,
                ftt_include_empty: 0
            }
        };
    }

    stateToArgs(state:MatchingDocsModelState, query:string):KontextMatchingDocsQueryArgs {
        if (state.searchAttrs.length > 1) {
            console.warn('MatchingDocsTile: Kontext API will take only first item from `searchAttrs` config!');
        }
        return {
            corpname: state.corpname,
            usesubcorp: state.subcname,
            q: `~${query}`,
            fcrit: `${List.head(state.searchAttrs)} 0`,
            flimit: state.minFreq,
            freq_type: 'text-types',
            freq_sort: 'rel',
            fpage: 1,
            pagesize: state.maxNumCategories,
            ftt_include_empty: 0,
            format: 'json',
            // display attrs not supported for this API
            searchAttrs: null,
            displayAttrs: null,
        };
    }

    getSourceDescription(tileId:number, lang:string, corpname:string):Observable<CorpusDetails> {
        return this.srcInfoService.call({
            tileId: tileId,
            corpname: corpname,
            format: 'json'
        });
    }

    call(args:KontextMatchingDocsQueryArgs):Observable<APIResponse> {
        return this.freqApi.call(args).pipe(
            map<HTTPResponse, APIResponse>(resp => ({
                data: List.map(
                    v => ({
                        searchValues: [List.map(v => v.n, v.Word).join(' ')],
                        displayValues: [List.map(v => v.n, v.Word).join(' ')],
                        score: v.rel
                    }),
                    resp.Blocks[0].Items
                )
            }))
        );
    }

}

export interface FillHTTPResponse {
    data:{[searchId:string]:{[attr:string]:string}};
}

export class KontextLiveattrsMatchingDocsAPI extends KontextMatchingDocsAPI {

    stateToArgs(state:MatchingDocsModelState, query:string):KontextMatchingDocsQueryArgs {
        return {
            ...super.stateToArgs(state, query),
            searchAttrs: state.searchAttrs,
            displayAttrs: state.displayAttrs
        };
    }

    call(args:KontextMatchingDocsQueryArgs):Observable<APIResponse> {
        return super.call(args).pipe(
            mergeMap(freq =>
                cachedAjax$<FillHTTPResponse>(this.cache)(
                    HTTP.Method.POST,
                    this.apiURL + '/fill_attrs',
                    {
                        corpname: args.corpname,
                        search: args.searchAttrs[0],
                        values: List.flatMap(v => v.searchValues, freq.data),
                        fill: args.displayAttrs,
                    },
                    {
                        headers: this.apiServices.getApiHeaders(this.apiURL),
                        withCredentials: true,
                        contentType: 'application/json',
                    }
                ).pipe(
                    map(fill => ({
                        freq,
                        fill,
                    }))
                )
            ),
            map(({freq, fill}) => {
                freq.data = List.map(f => {
                    const id = f.searchValues[0];
                    f.displayValues = List.map(attr => fill[id][attr.replace('.', '_')], args.displayAttrs);
                    return f;
                }, freq.data);
                return freq
            })
        );
    }

}
