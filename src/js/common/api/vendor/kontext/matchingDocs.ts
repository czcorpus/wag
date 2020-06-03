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
import { MatchingDocsModelState, KontextFreqBacklinkArgs } from '../../../models/matchingDocs';
import { MatchingDocsAPI, APIResponse } from '../../abstract/matchingDocs';
import { cachedAjax$ } from '../../../ajax';
import { Observable } from 'rxjs';
import { HTTPHeaders, IAsyncKeyValueStore, CorpusDetails } from '../../../types';
import { HTTP } from 'cnc-tskit';
import { map } from 'rxjs/operators';
import { SingleCritQueryArgs, HTTPResponse } from './freqs';
import { CorpusInfoAPI } from './corpusInfo';
import { BacklinkWithArgs } from '../../../tile';


export class KontextMatchingDocsAPI implements MatchingDocsAPI<SingleCritQueryArgs> {

    private readonly apiURL:string;

    private readonly customHeaders:HTTPHeaders;

    private readonly cache:IAsyncKeyValueStore;

    private readonly srcInfoService:CorpusInfoAPI;

    constructor(cache:IAsyncKeyValueStore, apiURL:string, customHeaders?:HTTPHeaders) {
        this.cache = cache;
        this.apiURL = apiURL;
        this.customHeaders = customHeaders || {};
        this.srcInfoService = new CorpusInfoAPI(cache, apiURL, customHeaders);
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
                flimit: 1,
                freq_sort: "rel",
                fpage: 1,
                ftt_include_empty: 0
            }
        };
    }

    stateToArgs(state:MatchingDocsModelState, query:string):SingleCritQueryArgs {
        if (state.searchAttrs.length > 1) {
            console.warn('MatchingDocsTile: Kontext API will take only first item from `searchAttrs` config!');
        }
        return {
            corpname: state.corpname,
            usesubcorp: state.subcname,
            q: `~${query}`,
            fcrit: state.searchAttrs[0],
            flimit: 1,
            freq_sort: 'rel',
            fpage: 1,
            pagesize: state.maxNumCategories,
            ftt_include_empty: 0,
            format: 'json'
        };
    }

    getSourceDescription(tileId:number, lang:string, corpname:string):Observable<CorpusDetails> {
        return this.srcInfoService.call({
            tileId: tileId,
            corpname: corpname,
            format: 'json'
        });
    }

    call(args:SingleCritQueryArgs):Observable<APIResponse> {
        return cachedAjax$<HTTPResponse>(this.cache)(
            'GET',
            this.apiURL + '/freqs',
            args,
            {headers: this.customHeaders}
        ).pipe(
            map<HTTPResponse, APIResponse>(resp => ({
                data: resp.Blocks[0].Items.map(v => ({
                        name: v.Word.map(v => v.n).join(' '),
                        score: v.rel
                }))
            }))
        );
    }

}