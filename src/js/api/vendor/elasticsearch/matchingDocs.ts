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
import { MatchingDocsModelState } from '../../../models/tiles/matchingDocs';
import { MatchingDocsAPI, APIResponse } from '../../abstract/matchingDocs';
import { cachedAjax$ } from '../../../page/ajax';
import { Observable } from 'rxjs';
import { HTTPHeaders, IAsyncKeyValueStore, SourceDetails } from '../../../types';
import { map } from 'rxjs/operators';


export interface HTTPResponse {
    took:number;
    timed_out:boolean;
    _shards:{[key:string]:number};
    hits:{
        total: {
            value:number;
            relation:string;
        };
        max_score: number;
        hits: Array<{
            _index:string;
            _type:string;
            _id:string;
            _score:number;
            _source:{[field:string]:string}
        }>
    }
}

interface ElasticsearchQueryArgs {
    q: string;
    _source: string;
    sort: string;
    size: number;
    displayAttrs:Array<string>;
}


export class ElasticsearchMatchingDocsAPI implements MatchingDocsAPI<ElasticsearchQueryArgs> {

    private readonly apiURL:string;

    private readonly customHeaders:HTTPHeaders;

    private readonly cache:IAsyncKeyValueStore;

    constructor(cache:IAsyncKeyValueStore, apiURL:string, customHeaders?:HTTPHeaders) {
        this.cache = cache;
        this.apiURL = apiURL;
        this.customHeaders = customHeaders || {};
    }

    stateToBacklink(state:MatchingDocsModelState, query:string):null {
        return null;
    }

    stateToArgs(state:MatchingDocsModelState, query:string):ElasticsearchQueryArgs {
        return {
            q: state.searchAttrs.map(value => `${value}:${query}`).join(' OR '),
            displayAttrs: state.displayAttrs,
            _source: state.searchAttrs.join(','),
            sort: '_score:desc',
            size: state.maxNumCategories
        }
    }

    getSourceDescription(tileId:number, lang:string, corpname:string):Observable<SourceDetails> {
        return null;
    }

    call(args:ElasticsearchQueryArgs):Observable<APIResponse> {
        return cachedAjax$<HTTPResponse>(this.cache)(
            'GET',
            this.apiURL,
            args,
            {headers: this.customHeaders},
        ).pipe(
            map<HTTPResponse, APIResponse>(resp => ({
                data: resp.hits.hits.map(v => ({
                        name: args.displayAttrs.map(attr => {
                                let item:any = v._source;
                                for (let index of attr.split('.')) {item = item[index]}
                                return item;
                            }).join(', '),
                        score: v._score
                }))
            }))
        );
    }

}