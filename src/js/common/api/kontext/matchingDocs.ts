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
import { MatchingDocsModelState } from '../../models/matchingDocs';
import { MatchingDocsAPI, APIResponse } from '../abstract/matchingDocs';
import { cachedAjax$ } from '../../ajax';
import { Observable } from 'rxjs';
import { HTTPHeaders, IAsyncKeyValueStore } from '../../types';
import { map } from 'rxjs/operators';
import { SingleCritQueryArgs, HTTPResponse } from './freqs';


export class KontextMatchingDocsAPI implements MatchingDocsAPI<SingleCritQueryArgs> {

    private readonly apiURL:string;

    private readonly customHeaders:HTTPHeaders;

    private readonly cache:IAsyncKeyValueStore;

    constructor(cache:IAsyncKeyValueStore, apiURL:string, customHeaders?:HTTPHeaders) {
        this.cache = cache;
        this.apiURL = apiURL;
        this.customHeaders = customHeaders || {};
    }

    stateToArgs(state:MatchingDocsModelState, query:string):SingleCritQueryArgs {
        return {
            corpname: state.corpname,
            usesubcorp: state.subcname,
            q: `~${query}`,
            fcrit: state.srchAttrs.get(0), // TODO check list.size > 1 => e.g. show a warning
            flimit: 1, // TODO
            freq_sort: 'rel',
            fpage: state.currPage,
            ftt_include_empty: 1,
            format: 'json'
        };
    }

    call(args:SingleCritQueryArgs):Observable<APIResponse> {
        return cachedAjax$<HTTPResponse>(this.cache)(
            'GET',
            this.apiURL,
            args,
            {headers: this.customHeaders}

        ).pipe(
            map<HTTPResponse, APIResponse>(resp => ({
                data: resp.Blocks[0].Items.map(v => ({
                        name: v.Word.map(v => v.n).join(' '),
                        score: v.rel
                })),
                concId: resp.conc_persistence_op_id,
                corpname: args.corpname,
                usesubcorp: args.usesubcorp || null,
                concsize: resp.concsize
            }))
        );
    }

}