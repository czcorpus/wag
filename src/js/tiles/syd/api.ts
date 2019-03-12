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
import { forkJoin, Observable, of as rxOf } from 'rxjs';
import { concatMap, share } from 'rxjs/operators';

import { ajax$ } from '../../common/ajax';
import {
    ConcApi,
    ConcResponse,
    QuerySelector,
    RequestArgs as ConcRequestArgs,
    setQuery,
    ViewMode,
} from '../../common/api/kontext/concordance';
import { HTTPResponse as FreqsHTTPResponse } from '../../common/api/kontext/freqs';
import { MultiDict } from '../../common/data';
import { CorePosAttribute, DataApi, HTTPHeaders } from '../../common/types';


export interface RequestArgs {
    corp1:string;
    corp2:string;
    word1:string;
    word2:string;
    fcrit1:Array<string>;
    fcrit2:Array<string>;
    flimit:string;
    freq_sort:string;
    fpage:string;
    ftt_include_empty:string;
    format:'json';
}

export interface Response {
    results:Array<StrippedFreqResponse>;
    procTime:number;
}

export interface StrippedFreqResponse {
    items:Array<{
        Word:Array<{n:string}>;
        fbar:number;
        freq:number;
        freqbar:number;
        nbar:number;
        nfilter:Array<[string, string]>;
        pfilter:Array<[string, string]>;
        rel:number;
        relbar:number;
    }>;
    total:number;
    corpname:string;
    concsize:number;
    fcrit:string;
}

export class SyDAPI implements DataApi<RequestArgs, Response> {

    private readonly apiURL:string;

    private readonly customHeaders:HTTPHeaders;

    private readonly conc1:ConcApi;

    private readonly conc2:ConcApi;

    constructor(apiURL:string, concApiURL:string, customHeaders?:HTTPHeaders) {
        this.apiURL = apiURL;
        this.customHeaders = customHeaders || {};
        this.conc1 = new ConcApi(concApiURL, this.customHeaders);
        this.conc2 = new ConcApi(concApiURL, this.customHeaders);
    }

    call(args:RequestArgs):Observable<Response> {
        const t1 = new Date().getTime();
        const args1:ConcRequestArgs = {
            corpname: args.corp1,
            queryselector: QuerySelector.PHRASE,
            kwicleftctx: '-1',
            kwicrightctx: '1',
            async: '0',
            pagesize: '1',
            fromp: '1',
            attr_vmode: ViewMode.KWIC,
            attrs: CorePosAttribute.WORD,
            viewmode: ViewMode.KWIC,
            format:'json'
        };
        setQuery(args1, args.word1);
        const conc1$ = this.conc1.call(args1).pipe(share());

        const args2:ConcRequestArgs = {
            corpname: args.corp2,
            queryselector: QuerySelector.PHRASE,
            kwicleftctx: '-5',
            kwicrightctx: '5',
            async: '0',
            pagesize: '1',
            fromp: '1',
            attr_vmode: ViewMode.KWIC,
            attrs: CorePosAttribute.WORD,
            viewmode: ViewMode.KWIC,
            format:'json'
        };
        setQuery(args2, args.word2);
        const conc2$ = this.conc2.call(args2).pipe(share());

        const createRequests = (conc$:Observable<ConcResponse>, corpname:string, frcrits:Array<string>) => {
            return frcrits.map(
                fcrit => conc$.pipe(
                    concatMap(
                        (data) => {
                            const args1 = new MultiDict();
                            args1.set('q', '~' + data.conc_persistence_op_id);
                            args1.set('corpname', corpname);
                            args1.set('fcrit', fcrit);
                            args1.set('flimit', args.flimit);
                            args1.set('freq_sort', args.freq_sort);
                            args1.set('fpage', args.fpage);
                            args1.set('ftt_include_empty', args.ftt_include_empty);
                            args1.set('format', args.format);

                            return ajax$<FreqsHTTPResponse>(
                                'GET',
                                this.apiURL,
                                args1,
                                {headers: this.customHeaders}
                            );
                        }
                    ),
                    concatMap(
                        (data) => {
                            return rxOf({
                                items: data.Blocks[0].Items,
                                total: data.Blocks[0].Total,
                                corpname: corpname,
                                fcrit: fcrit,
                                concsize: data.concsize
                            });
                        }
                    )
                )
            );
        };

        const s1$ = createRequests(conc1$, args.corp1, args.fcrit1);
        const s2$ = createRequests(conc2$, args.corp2, args.fcrit2);

        return forkJoin(...s1$, ...s2$).pipe(
            concatMap(
                (data) => {
                    return rxOf({
                        results: data,
                        procTime: Math.round((new Date().getTime() - t1) / 10) / 100
                    })
                }
            )
        );
    }
}