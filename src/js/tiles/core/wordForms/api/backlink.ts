/*
 * Copyright 2025 Martin Zimandl <martin.zimandl@gmail.com>
 * Copyright 2025 Institute of the Czech National Corpus,
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
import { catchError, concatMap, map, Observable } from "rxjs";
import { RequestArgs } from "../common.js";
import { ajax$ } from "../../../../page/ajax.js";
import urlJoin from "url-join";
import { mkLemmaMatchQuery } from "../../../../api/vendor/mquery/common.js";
import { QueryMatch } from "../../../../query/index.js";
import { Backlink, BacklinkConf } from "../../../../page/tile.js";
import { IApiServices } from "../../../../appServices.js";
import { CorpusInfoAPI } from "../../../../api/vendor/mquery/corpusInfo.js";



export class WordFormsBacklinkAPI {

    protected readonly apiURL:string;

    protected readonly apiServices:IApiServices;

    protected readonly srcInfoService:CorpusInfoAPI;

    protected readonly backlinkConf:BacklinkConf;

    protected readonly posQueryGenerator:[string, string];

    constructor(apiURL:string, apiServices:IApiServices, posQueryGenerator:[string, string], backlinkConf:BacklinkConf) {
        this.apiURL = apiURL;
        this.apiServices = apiServices;
        this.srcInfoService = new CorpusInfoAPI(apiURL, apiServices);
        this.backlinkConf = backlinkConf;
        this.posQueryGenerator = posQueryGenerator;
    }

    requestBacklink(args:RequestArgs, queryMatch:QueryMatch):Observable<URL> {
        const concArgs = {
            corpname: args.corpName,
            q: `q${mkLemmaMatchQuery(queryMatch, this.posQueryGenerator)}`,
            format: 'json',
        };
        return ajax$<{conc_persistence_op_id:string}>(
            'GET',
            urlJoin(this.backlinkConf.url, 'create_view'),
            concArgs,
            {
                headers: this.apiServices.getApiHeaders(this.apiURL),
                withCredentials: true,
            }
        ).pipe(
            concatMap(resp => {
                const url = new URL(urlJoin(this.backlinkConf.url, 'freqs'));
                url.searchParams.set('corpname', args.corpName);
                url.searchParams.set('q', `~${resp.conc_persistence_op_id}`);
                url.searchParams.set('fcrit', 'word/ie 0~0>0');
                url.searchParams.set('freq_type', 'tokens');
                url.searchParams.set('freq_sort', 'freq');
                
                // Validate the constructed URL
                return ajax$(
                    'GET',
                    url.toString(),
                    null,
                    {
                        headers: this.apiServices.getApiHeaders(this.apiURL),
                        withCredentials: true,
                    }
                ).pipe(
                    catchError(err => {
                        if (err.status === 401) {
                            throw new Error('global__kontext_login_required')
                        }
                        throw err;
                    }),
                    map(() => url)
                );
            })
        );
    }

    getBacklink(queryId:number, subqueryId?:number):Backlink|null {
        if (this.backlinkConf) {
            return {
                queryId,
                subqueryId,
                label: this.backlinkConf.label || 'KonText',
                async: true,
            };
        }
        return null;
    }
}