/*
 * Copyright 2019 Tomas Machalek <tomas.machalek@gmail.com>
 * Copyright 2022 Martin Zimandl <martin.zimandl@gmail.com>
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

import { Dict, HTTP, List } from 'cnc-tskit';
import { map, Observable } from 'rxjs';
import urlJoin from 'url-join';

import { IDataStreaming } from '../../../page/streaming.js';
import { RequestArgs, TreqAPICommon } from '../translations/api.js';
import { ajax$, encodeArgs } from '../../../page/ajax.js';


interface HTTPResponseLine {
    freq:string;
    perc:string;
    from:string;
    to:string;
}


interface HTTPResponse {
    error?:string;
    subsets:{[subsetId:string]:{sum:number; lines: Array<HTTPResponseLine>}};
}


export interface WordTranslation {
    score:number;
    freq:number; // TODO probably a candidate for removal
    word:string;
    firstTranslatLc:string;
    translations:Array<string>;
    interactionId:string;
    color?:string;
}

export interface TranslationResponse {
    subsets:{[subsetId:string]:Array<WordTranslation>};
}


export function filterByMinFreq(data:{[subsetId:string]:Array<WordTranslation>}, minFreq:number):{[subsetId:string]:Array<WordTranslation>} {
    return Dict.map(
        (values, subsetId) => List.filter(
            x => x.freq >= minFreq,
            values
        ),
        data
    );
}


export class TreqSubsetsAPI extends TreqAPICommon {

    call(streaming:IDataStreaming|null, tileId:number, queryIdx:number, args:{[subsetId:string]:RequestArgs}):Observable<TranslationResponse> {
        const headers = this.appServices.getApiHeaders(this.apiURL);
        headers['X-Is-Web-App'] = '1';
        const source = streaming ?
            streaming.registerTileRequest<HTTPResponse>({
                isEventSource: true,
                contentType: 'application/json',
                body: args,
                method: HTTP.Method.POST,
                tileId,
                url: urlJoin(this.apiURL, 'subsets') + '?' + encodeArgs({ tileId }),
            }) : ajax$<HTTPResponse>(
                HTTP.Method.GET,
                this.apiURL,
                args,
                {
                    headers,
                    withCredentials: true
                },
            );

        return source.pipe(
            map(
                resp => {
                    if (!resp) {
                        throw new Error('Empty response from Treq server');
                    }
                    return {
                        ...resp,
                        subsets: Dict.map(
                            (values, subsetId) => {
                                return this.mergeByLowercase(
                                    List.map(
                                        v => ({
                                            freq: parseInt(v.freq),
                                            score: parseFloat(v.perc),
                                            word: v.from,
                                            firstTranslatLc: v.to.toLowerCase(),
                                            translations: [v.to],
                                            interactionId: ''
                                        }),
                                        values.lines
                                    )
                                ).slice(0, 10)
                            },
                            resp.subsets
                        )
                    };
                }
            )
        );
    }

}