/*
 * Copyright 2023 Martin Zimandl <martin.zimandl@gmail.com>
 * Copyright 2023 Institute of the Czech National Corpus,
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

import { CustomArgs, TimeDistribApi, TimeDistribArgs, TimeDistribResponse } from '../../abstract/timeDistrib';
import { Observable } from 'rxjs';
import { IAsyncKeyValueStore, CorpusDetails } from '../../../types';
import { Backlink, BacklinkWithArgs } from '../../../page/tile';
import { IApiServices } from '../../../appServices';
import { Dict, List, pipe } from 'cnc-tskit';
import { FreqRowResponse } from './common';
import { CorpusInfoAPI } from './corpusInfo';

export interface MqueryStreamData {
    chunkNum:number;
    totalChunks:number;
    error:string;
    entries:{
        concSize:number;
        corpusSize:number;
        searchSize:number;
        freqs:FreqRowResponse[];
    };
}

/**
 * This is the main TimeDistrib API for KonText. It should work in any
 * case.
 */
export class MQueryTimeDistribStreamApi implements TimeDistribApi {

    private readonly apiURL:string;

    private readonly customArgs:CustomArgs;

    private readonly srcInfoService:CorpusInfoAPI;

    constructor(cache:IAsyncKeyValueStore, apiURL:string, apiServices:IApiServices, customArgs:CustomArgs) {
        this.apiURL = apiURL;
        this.customArgs = customArgs;
        this.srcInfoService = new CorpusInfoAPI(cache, apiURL, apiServices);
    }

    getSourceDescription(tileId:number, lang:string, corpname:string):Observable<CorpusDetails> {
        return this.srcInfoService.call({tileId, corpname, lang});
    }

    createBackLink(backlink:Backlink, corpname:string, concId:string, origQuery:string):BacklinkWithArgs<{}> {
        return null
    }

    call(queryArgs:TimeDistribArgs):Observable<TimeDistribResponse> {
        return new Observable(o => {
            const args = pipe(
                {
                    ...this.customArgs,
                    q: queryArgs.concIdent,
                },
                Dict.map(
                    (v, k) => encodeURIComponent(v)
                ),
                Dict.toEntries(),
                List.map(
                    ([k, v]) => `${k}=${v}`
                ),
                x => x.join('&')
            );
            const eventSource = new EventSource(`${this.apiURL}/freqs-by-year-streamed/${queryArgs.corpName}?${args}`);
            const procChunks:{[k:number]:number} = {};

            eventSource.onmessage = (e) => {
                const message = JSON.parse(e.data) as MqueryStreamData;
                if (message.error) {
                    eventSource.close();
                    o.error(new Error(message.error));

                } else {
                    o.next({
                        corpName: queryArgs.corpName,
                        subcorpName: queryArgs.subcorpName,
                        data: List.map(
                            v => ({
                                datetime: v.value,
                                freq: v.freq,
                                norm: v.base,
                            }),
                            message.entries.freqs,
                        ),
                        overwritePrevious: true,
                    });
                }

                if (message.chunkNum) { // valid chunk nums start with 1 (see Mquery docs)
                    procChunks[message.chunkNum] = (new Date().getTime()) / 1000;
                }

                const totalProc = pipe(
                    procChunks,
                    Dict.filter((v, k) => !!v),
                    Dict.size()
                );

                if (totalProc >= message.totalChunks) {
                    eventSource.close();
                    o.complete();
                }
            };

            eventSource.onerror = (e) => {
                console.log(e);
            };

        });
    }
}
