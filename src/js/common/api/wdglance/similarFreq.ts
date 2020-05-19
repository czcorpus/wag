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
import { pipe, List } from 'cnc-tskit';

import { cachedAjax$ } from '../../../common/ajax';
import { HTTPHeaders, IAsyncKeyValueStore, SourceDetails } from '../../../common/types';
import { QueryMatch, matchesPos, calcFreqBand } from '../../../common/query/index';
import { MultiDict } from '../../../common/data';
import { SimilarFreqDbAPI, RequestArgs, Response } from '../../../common/api/abstract/similarFreq';
import { HTTPAction } from '../../../server/routes/actions';


interface HTTPResponse {
    result:Array<QueryMatch>;
}

export class SimilarFreqWordsNullAPI implements SimilarFreqDbAPI {

    call(args:RequestArgs):Observable<Response> {
        return rxOf({result: []});
    }
}


export class SimilarFreqWordsAPI implements SimilarFreqDbAPI {

    private readonly apiURL:string;

    private readonly customHeaders:HTTPHeaders;

    private readonly cache:IAsyncKeyValueStore;

    constructor(cache:IAsyncKeyValueStore, apiURL:string, customHeaders?:HTTPHeaders) {
        this.cache = cache;
        this.apiURL = apiURL;
        this.customHeaders = customHeaders || {};
    }

    call(args:RequestArgs):Observable<Response> {
        return cachedAjax$<HTTPResponse>(this.cache)(
            'GET',
            this.apiURL + HTTPAction.SIMILAR_FREQ_WORDS,
            new MultiDict([
                ['lang', args.lang],
                ['word', args.word],
                ['lemma', args.lemma],
                ['pos', args.pos.join(' ')],
                ['srchRange', args.srchRange]
            ]),
            {headers: this.customHeaders}

        ).pipe(
            map(data => ({
                result: pipe(
                    data.result,
                    List.map(
                        v => ({
                            lemma: v.lemma,
                            pos: v.pos,
                            ipm: v.ipm,
                            flevel: calcFreqBand(v.ipm)
                        })
                    ),
                    List.filter(item => item.lemma !== args.lemma || !matchesPos(item, args.pos))
                )
            }))
        );
    }
}

