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
import { pipe, List } from 'cnc-tskit';

import { ajax$ } from '../../../page/ajax.js';
import { QueryMatch, matchesPos, calcFreqBand } from '../../../query/index.js';
import { MultiDict } from '../../../multidict.js';
import { RequestArgs, Response } from '../../abstract/similarFreq.js';
import { HTTPAction } from '../../../page/actions.js';
import { IApiServices } from '../../../appServices.js';

interface HTTPResponse {
    result: Array<QueryMatch>;
}

export class SimilarFreqWordsAPI {
    private readonly apiURL: string;

    private readonly apiServices: IApiServices;

    constructor(apiURL: string, apiServices: IApiServices) {
        this.apiURL = apiURL;
        this.apiServices = apiServices;
    }

    call(
        tileId: number,
        queryIdx: number,
        multicastRequest: boolean,
        args: RequestArgs
    ): Observable<Response> {
        return ajax$<HTTPResponse>(
            'GET',
            this.apiURL + HTTPAction.SIMILAR_FREQ_WORDS,
            new MultiDict([
                ['domain', args.corpname],
                ['word', args.word],
                ['lemma', args.lemma],
                ['pos', args.pos.join(' ')],
                ['mainPosAttr', args.mainPosAttr],
                ['srchRange', args.srchRange],
            ]),
            {
                headers: this.apiServices.getApiHeaders(this.apiURL),
                withCredentials: true,
            }
        ).pipe(
            map((data) => ({
                result: pipe(
                    data.result,
                    List.map((v) => ({
                        lemma: v.lemma,
                        pos: v.pos,
                        upos: v.upos,
                        ipm: v.ipm,
                        flevel: calcFreqBand(v.ipm),
                    })),
                    List.filter(
                        (item) =>
                            item.lemma !== args.lemma ||
                            !matchesPos(item, args.mainPosAttr, args.pos)
                    )
                ),
            }))
        );
    }
}
