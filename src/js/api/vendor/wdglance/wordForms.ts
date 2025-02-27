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

import { Observable, of as rxOf } from 'rxjs';
import { map } from 'rxjs/operators';

import { SourceDetails } from '../../../types.js';
import { HTTP } from 'cnc-tskit';
import { ajax$ } from '../../../page/ajax.js';
import { QueryMatch, QueryType } from '../../../query/index.js';
import { IWordFormsApi, RequestArgs, Response } from '../../abstract/wordForms.js';
import { HTTPAction } from '../../../server/routes/actions.js';
import { InternalResourceInfoApi } from './freqDbSourceInfo.js';
import { IApiServices } from '../../../appServices.js';
import { Backlink } from '../../../page/tile.js';


export interface HTTPResponse {
    result:Array<QueryMatch>;
}


export class WordFormsWdglanceAPI implements IWordFormsApi {

    private readonly apiUrl:string;

    private readonly srcInfoApi:InternalResourceInfoApi;

    constructor(url:string, srcInfoURL:string, apiServices:IApiServices) {
        this.apiUrl = url;
        this.srcInfoApi = srcInfoURL ? new InternalResourceInfoApi(srcInfoURL, apiServices) : null;
    }

    call(args:RequestArgs):Observable<Response> {
        return ajax$<HTTPResponse>(
            HTTP.Method.GET,
            this.apiUrl + HTTPAction.WORD_FORMS,
            args

        ).pipe(
            map(
                (item) => {
                    const total = item.result.reduce((acc, curr) => curr.abs + acc, 0);
                    return {
                        forms: item.result.map(v => ({
                            value: v.word,
                            freq: v.abs,
                            ratio: v.abs / total
                        }))
                    };
                }
            )
        );
    }

    getSourceDescription(tileId:number, domain:string, corpname:string):Observable<SourceDetails> {
        return this.srcInfoApi ?
            this.srcInfoApi.call({
                tileId: tileId,
                corpname: corpname,
                queryType: QueryType.SINGLE_QUERY,
                domain: domain
            }) :
             rxOf({
                tileId: tileId,
                title: 'Word forms generated from an internal database (no additional details available)',
                description: '',
                author: '',
                href: '',
                structure: {
                    numTokens: 0 // TODO
                }
            });
    }

    createBacklink(args:RequestArgs, backlink:Backlink) {
        return null
    }

    supportsMultiWordQueries():boolean {
        return true;
    }

}