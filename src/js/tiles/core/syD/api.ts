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

import { ConcApi } from '../../../api/vendor/kontext/concordance/v015';
import { ConcResponse, ViewMode } from '../../../api/abstract/concordance';
import { SimpleKontextFreqDistribAPI, SingleCritQueryArgs } from '../../../api/vendor/kontext/freqs';
import { CorePosAttribute, DataApi, IAsyncKeyValueStore } from '../../../types';
import { callWithExtraVal } from '../../../api/util';
import { IApiServices } from '../../../appServices';
import { ConcQueryArgs } from '../../../api/vendor/kontext/types';
import { CoreApiGroup } from '../../../api/coreGroups';
import { createKontextConcApiInstance } from '../../../api/factory/concordance';
import { createSimpleFreqApiInstance } from '../../../api/factory/freqs';


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
    reqId:string;
}

export class SyDAPI implements DataApi<RequestArgs, Response> {

    private readonly concApi:ConcApi;

    private readonly freqApi:SimpleKontextFreqDistribAPI;

    constructor(
        concApi:ConcApi,
        freqApi:SimpleKontextFreqDistribAPI,
    ) {
        this.concApi = concApi;
        this.freqApi = freqApi;
    }

    call(args:RequestArgs):Observable<Response> {
        const t1 = new Date().getTime();

        // query 1, corp 1 ---------

        const args1:ConcQueryArgs = {
            type:'concQueryArgs',
            queries: [{
                corpname: args.corp1,
                qtype: 'simple',
                query: args.word1,
                queryParsed: [],
                qmcase: true,
                pcq_pos_neg: 'pos',
                include_empty: false,
                default_attr: 'word',
                use_regexp: false
            }],
            maincorp: args.corp1,
            usesubcorp: undefined,
            viewmode: ViewMode.KWIC,
            pagesize: 1,
            shuffle: 0,
            fromp: 1,
            attr_vmode: 'visible-all',
            attrs: [CorePosAttribute.WORD],
            ctxattrs: [],
            structs: [],
            refs: [],
            text_types: {},
            context: {
                fc_lemword_window_type: undefined,
                fc_lemword_wsize: 0,
                fc_lemword: undefined,
                fc_lemword_type: undefined,
                fc_pos_window_type: undefined,
                fc_pos_wsize: undefined,
                fc_pos: [],
                fc_pos_type: undefined
            },
            base_viewattr: 'word',
            kwicleftctx: -5,
            kwicrightctx: 5
        };
        const concQ1C1$ = callWithExtraVal(
            this.concApi,
            {...args1, kwicleftctx: -5, kwicrightctx: 5},
            `${args.corp1}/${args.word1}`
        ).pipe(share());

        // query 1, corp 2 ---------

        const args2:ConcQueryArgs = {
            queries: [{
                corpname: args.corp2,
                qtype: 'simple',
                query: args.word1,
                queryParsed: [],
                qmcase: true,
                pcq_pos_neg: 'pos',
                include_empty: false,
                default_attr: 'word',
                use_regexp: false
            }],
            maincorp: args.corp1,
            usesubcorp: undefined,
            viewmode: ViewMode.KWIC,
            pagesize: 1,
            shuffle: 0,
            type:'concQueryArgs',
            fromp: 1,
            attr_vmode: 'visible-all',
            attrs: [CorePosAttribute.WORD],
            ctxattrs: [],
            structs: [],
            refs: [],
            text_types: {},
            context: {
                fc_lemword_window_type: undefined,
                fc_lemword_wsize: 0,
                fc_lemword: undefined,
                fc_lemword_type: undefined,
                fc_pos_window_type: undefined,
                fc_pos_wsize: undefined,
                fc_pos: [],
                fc_pos_type: undefined
            },
            base_viewattr: 'word',
            kwicleftctx: -5,
            kwicrightctx: 5
        };
        const concQ1C2$ = callWithExtraVal(
            this.concApi,
            {...args2, kwicleftctx: -5, kwicrightctx: 5},
            `${args.corp2}/${args.word1}`
        ).pipe(share());

        // query 2, corp 1 ---------

        const args3:ConcQueryArgs = {
            queries: [{
                corpname: args.corp1,
                qtype: 'simple',
                query: args.word2,
                queryParsed: [],
                qmcase: true,
                pcq_pos_neg: 'pos',
                include_empty: false,
                default_attr: 'word',
                use_regexp: false
            }],
            maincorp: args.corp1,
            usesubcorp: undefined,
            viewmode: ViewMode.KWIC,
            pagesize: 1,
            shuffle: 0,
            type:'concQueryArgs',
            fromp: 1,
            attr_vmode: 'visible-all',
            attrs: [CorePosAttribute.WORD],
            ctxattrs: [],
            structs: [],
            refs: [],
            text_types: {},
            context: {
                fc_lemword_window_type: undefined,
                fc_lemword_wsize: 0,
                fc_lemword: undefined,
                fc_lemword_type: undefined,
                fc_pos_window_type: undefined,
                fc_pos_wsize: undefined,
                fc_pos: [],
                fc_pos_type: undefined
            },
            base_viewattr: 'word',
            kwicleftctx: -5,
            kwicrightctx: 5
        };
        const concQ2C1$ = callWithExtraVal(
            this.concApi,
            {...args3, kwicleftctx: -5, kwicrightctx: 5},
            `${args.corp1}/${args.word2}`
        ).pipe(share());

        // query 2, corp 2 ---------

        const args4:ConcQueryArgs = {
            queries: [{
                corpname: args.corp2,
                qtype: 'simple',
                query: args.word2,
                queryParsed: [],
                qmcase: true,
                pcq_pos_neg: 'pos',
                include_empty: false,
                default_attr: 'word',
                use_regexp: false
            }],
            maincorp: args.corp1,
            usesubcorp: undefined,
            viewmode: ViewMode.KWIC,
            pagesize: 1,
            shuffle: 0,
            type:'concQueryArgs',
            fromp: 1,
            attr_vmode: 'visible-all',
            attrs: [CorePosAttribute.WORD],
            ctxattrs: [],
            structs: [],
            refs: [],
            text_types: {},
            context: {
                fc_lemword_window_type: undefined,
                fc_lemword_wsize: 0,
                fc_lemword: undefined,
                fc_lemword_type: undefined,
                fc_pos_window_type: undefined,
                fc_pos_wsize: undefined,
                fc_pos: [],
                fc_pos_type: undefined
            },
            base_viewattr: 'word',
            kwicleftctx: -5,
            kwicrightctx: 5
        };
        const concQ2C2$ = callWithExtraVal(
            this.concApi,
            {...args4, kwicleftctx: -5, kwicrightctx: 5},
            `${args.corp2}/${args.word2}`
        ).pipe(share());

        const createRequests = (conc$:Observable<[ConcResponse, string]>, corpname:string, frcrits:Array<string>) => {
            return frcrits.map(
                fcrit => conc$.pipe(
                    concatMap(
                        (resp) => {
                            const [data, reqId] = resp;
                            const args1: SingleCritQueryArgs = {
                                q: '~' + data.concPersistenceID,
                                corpname,
                                fcrit,
                                flimit: parseInt(args.flimit),
                                freq_sort: args.freq_sort,
                                fpage: parseInt(args.fpage),
                                ftt_include_empty: parseInt(args.ftt_include_empty),
                                format: args.format,
                            } as SingleCritQueryArgs;

                            return this.freqApi.call(args1).pipe(
                                concatMap(
                                    (resp) => rxOf({
                                        conc_persistence_op_id: resp.conc_persistence_op_id,
                                        concsize: resp.concsize,
                                        Blocks: resp.Blocks, // TODO immutability ??
                                        reqId: reqId
                                    })
                                )
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
                                concsize: data.concsize,
                                reqId: data.reqId
                            });
                        }
                    )
                )
            );
        };

        const s1$ = createRequests(concQ1C1$, args.corp1, args.fcrit1);
        const s2$ = createRequests(concQ1C2$, args.corp2, args.fcrit2);
        const s3$ = createRequests(concQ2C1$, args.corp1, args.fcrit1);
        const s4$ = createRequests(concQ2C2$, args.corp2, args.fcrit2);

        return forkJoin([...s1$, ...s2$, ...s3$, ...s4$]).pipe(
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

export function createSyDInstance(apiType:string, apiURL:string, concApiURL:string, apiServices:IApiServices, cache:IAsyncKeyValueStore, apiOptions:{}):SyDAPI {

	switch (apiType) {
		case CoreApiGroup.KONTEXT:
        case CoreApiGroup.KONTEXT_API:
            return new SyDAPI(
                createKontextConcApiInstance(cache, apiType, concApiURL, apiServices, apiOptions),
                createSimpleFreqApiInstance(cache, apiType, apiURL, apiServices, apiOptions),
            )
		default:
			throw new Error(`API type "${apiType}" not supported for SyD.`);
	}

}