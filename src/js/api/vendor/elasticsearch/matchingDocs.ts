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
import { MatchingDocsModelState } from '../../../models/tiles/matchingDocs.js';
import { MatchingDocsAPI, APIResponse } from '../../abstract/matchingDocs.js';
import { ajax$ } from '../../../page/ajax.js';
import { Observable } from 'rxjs';
import { SourceDetails } from '../../../types.js';
import { map } from 'rxjs/operators';
import { IApiServices } from '../../../appServices.js';
import { Backlink } from '../../../page/tile.js';


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
    searchAttrs:Array<string>;
    displayAttrs:Array<string>;
}


export class ElasticsearchMatchingDocsAPI implements MatchingDocsAPI<ElasticsearchQueryArgs> {

    private readonly apiURL:string;

    private readonly apiServices:IApiServices;

    constructor(apiURL:string, apiServices:IApiServices) {
        this.apiURL = apiURL;
        this.apiServices = apiServices;
    }

    getBacklink(queryId:number):Backlink|null {
        return null;
    }

    stateToArgs(state:MatchingDocsModelState, query:string):ElasticsearchQueryArgs {
        return {
            q: state.searchAttrs.map(value => `${value}:${query}`).join(' OR '),
            searchAttrs: state.searchAttrs,
            displayAttrs: state.displayAttrs,
            _source: state.searchAttrs.join(','),
            sort: '_score:desc',
            size: state.maxNumCategories
        }
    }

    getSourceDescription(tileId:number, multicastRequest:boolean, lang:string, corpname:string):Observable<SourceDetails> {
        return null;
    }

    call(tileId:number, multicastRequest:boolean, args:ElasticsearchQueryArgs):Observable<APIResponse> {
        return ajax$<HTTPResponse>(
            'GET',
            this.apiURL,
            args,
            {
                headers: this.apiServices.getApiHeaders(this.apiURL),
                withCredentials: true
            },
        ).pipe(
            map<HTTPResponse, APIResponse>(resp => ({
                data: resp.hits.hits.map(v => ({
                    searchValues: args.searchAttrs.map(attr => {
                        let item:any = v._source;
                        for (let index of attr.split('.')) {item = item[index]}
                        return item;
                    }),
                    displayValues: args.displayAttrs.map(attr => {
                        let item:any = v._source;
                        for (let index of attr.split('.')) {item = item[index]}
                        return item;
                    }),
                    score: v._score
                }))
            }))
        );
    }

}