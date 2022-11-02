/*
 * Copyright 2020 Tomas Machalek <tomas.machalek@gmail.com>
 * Copyright 2020 Institute of the Czech National Corpus,
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
import { concatMap, map } from 'rxjs/operators';
import { List, HTTP, URL, Dict, pipe, tuple } from 'cnc-tskit';

import { cachedAjax$, encodeURLParameters } from '../../../../../page/ajax';
import { HTTPHeaders, IAsyncKeyValueStore, CorpusDetails } from '../../../../../types';
import { QueryMatch } from '../../../../../query';
import { ConcResponse, ViewMode, IConcordanceApi } from '../../../../abstract/concordance';
import { ConcordanceMinState } from '../../../../../models/tiles/concordance';
import { CorpusInfoAPI } from '../../corpusInfo';
import { IApiServices } from '../../../../../appServices';
import { mkLemmaMatchQuery, mkWordMatchQuery, convertLines, ConcViewResponse,
    ConcQueryResponse,
    PersistentConcArgs} from './common';
import { ConcQueryArgs, ConcViewArgs, FilterServerArgs, QuickFilterRequestArgs } from '../../types';



export class ConcApi implements IConcordanceApi<ConcQueryArgs|ConcViewArgs|FilterServerArgs|QuickFilterRequestArgs> {

    private readonly apiURL:string;

    private readonly customHeaders:HTTPHeaders;

    private readonly cache:IAsyncKeyValueStore;

    private readonly srcInfoService:CorpusInfoAPI;

    constructor(cache:IAsyncKeyValueStore, apiURL:string, apiServices:IApiServices) {
        this.apiURL = apiURL;
        this.customHeaders = apiServices.getApiHeaders(apiURL) || {};
        this.cache = cache;
        this.srcInfoService = new CorpusInfoAPI(cache, apiURL, apiServices);
    }

    getHeaders() {
        return this.customHeaders;
    }

    getSupportedViewModes():Array<ViewMode> {
        return [ViewMode.KWIC, ViewMode.SENT, ViewMode.ALIGN];
    }

    mkMatchQuery(lvar:QueryMatch, generator:[string, string]):string {
        if (lvar.pos.length > 0) {
            return mkLemmaMatchQuery(lvar, generator);

        } else if (lvar.word) {
            return mkWordMatchQuery(lvar);
        }
    }

    getSourceDescription(tileId:number, lang:string, corpname:string):Observable<CorpusDetails> {
        return this.srcInfoService.call({
            tileId: tileId,
            corpname: corpname,
            format: 'json'
        });
    }

    stateToArgs(state:ConcordanceMinState, lvar:QueryMatch|null, lvarIdx:number, otherLangCql:string):ConcQueryArgs|ConcViewArgs {
        if (lvar) {
            const ans:ConcQueryArgs & PersistentConcArgs = {
                type: 'concQueryArgs',
                queries: [{
                    corpname: state.corpname,
                    qtype: 'advanced',
                    query: this.mkMatchQuery(lvar, state.posQueryGenerator),
                    pcq_pos_neg: 'pos',
                    include_empty: false,
                    default_attr: 'word'
                }],
                maincorp: state.corpname,
                usesubcorp: state.subcname,
                viewmode: state.viewMode,
                shuffle: state.shuffle ? 1 : undefined,
                attr_vmode: state.attr_vmode,
                attrs: state.attrs,
                ctxattrs: [],
                base_viewattr: 'word',
                structs: [],
                refs: List.map(v => '=' + v.value, state.metadataAttrs),
                pagesize: state.pageSize,
                fromp: state.concordances[lvarIdx].loadPage,
                text_types: {},
                context: {
                    fc_lemword_window_type: undefined,
                    fc_lemword_wsize: undefined,
                    fc_lemword: undefined,
                    fc_lemword_type: undefined,
                    fc_pos_window_type: undefined,
                    fc_pos_wsize: undefined,
                    fc_pos: [],
                    fc_pos_type: undefined
                },
                kwicleftctx: -state.kwicLeftCtx,
                kwicrightctx: state.kwicRightCtx
            };

            if (state.otherCorpname) {
                ans.queries.push({
                    corpname: state.otherCorpname,
                    qtype: 'advanced',
                    query: otherLangCql || '',
                    pcq_pos_neg: 'pos',
                    include_empty: false,
                    default_attr: 'word'
                });
            }
            return ans;

        } else {
            return {
                type: 'concViewArgs',
                corpname: state.corpname,
                usesubcorp: state.subcname,
                maincorp: state.otherCorpname,
                kwicleftctx: `-${state.kwicLeftCtx}`,
                kwicrightctx: `${state.kwicRightCtx}`,
                pagesize: '' + state.pageSize,
                fromp: state.concordances[lvarIdx].loadPage.toFixed(),
                attr_vmode: state.attr_vmode,
                attrs: state.attrs.join(','),
                viewmode: state.viewMode,
                shuffle: state.shuffle ? 1 : undefined,
                refs: List.map(
                    v => '=' + v.value,
                    state.metadataAttrs
                ).join(','),
                q: `~${state.concordances[lvarIdx].concId}`,
                format: 'json'
            }
        }
    }

    /**
     * Create an action URL, action content type and action body args object based
     * on provided API args.
     */
    private createActionUrl(args:ConcQueryArgs|ConcViewArgs|FilterServerArgs|QuickFilterRequestArgs):[string, string, unknown] {
        switch (args.type) {
            case 'quickFilterQueryArgs':
                return tuple(
                    URL.join(this.apiURL, 'quick_filter') + '?' +
                        pipe(
                            {
                                ...args,
                                usesubcorp: args.usesubcorp,
                                maincorp: args.maincorp,
                                shuffle: args.shuffle || 0,
                                refs: args.refs
                            },
                            Dict.toEntries(),
                            encodeURLParameters
                        ),
                    'application/x-www-form-urlencoded; charset=UTF-8',
                    {}
                );
            case 'concQueryArgs':
                return tuple(URL.join(this.apiURL, 'query_submit'), 'application/json', args);
            case 'filterQueryArgs':
                return tuple(URL.join(this.apiURL, 'filter'), 'application/json', args);
            case 'concViewArgs':
                return tuple(URL.join(this.apiURL, 'view'), 'application/json', args);
            default:
                throw new Error('unknown ConcApi args type');
        }
    }

    call(args:ConcQueryArgs|ConcViewArgs|FilterServerArgs|QuickFilterRequestArgs):Observable<ConcResponse> {
        const corpname = args.type === 'concQueryArgs' ? args.queries[0].corpname : args.corpname;
        const [url, contentType, argsBody] = this.createActionUrl(args);
        return (args.type === 'concViewArgs' ?
            rxOf({
                Q: [],
                conc_persistence_op_id: args.q.substr(1),
                num_lines_in_groups: 0,
                lines_groups_numbers: [],
                query_overview: [],
                finished: true,
                size: -1,
                messages: []
            }) :
            cachedAjax$<ConcQueryResponse>(this.cache)(
                HTTP.Method.POST,
                url,
                argsBody,
                {
                    headers: this.getHeaders(),
                    contentType
                }
            )

        ).pipe(
            concatMap(
                resp => args.pagesize > 0 ?
                    cachedAjax$<ConcViewResponse>(this.cache)(
                        HTTP.Method.GET,
                        URL.join(this.apiURL, 'view'),
                        {
                            corpname,
                            usesubcorp: args.usesubcorp,
                            maincorp: args.maincorp,
                            q: '~' + resp.conc_persistence_op_id,
                            kwicleftctx: args.kwicleftctx,
                            kwicrightctx: args.kwicrightctx,
                            pagesize: args.pagesize,
                            fromp: args.fromp,
                            attr_vmode: args.attr_vmode,
                            attrs: Array.isArray(args.attrs) ? args.attrs.join(',') : args.attrs,
                            viewmode: args.viewmode,
                            shuffle: args.shuffle,
                            refs: args.refs,
                            format: 'json'
                        },
                        {
                            headers: this.getHeaders()
                        }
                    ) :
                    rxOf({
                        conc_persistence_op_id: resp.conc_persistence_op_id,
                        messages: resp.messages,
                        Lines: [],
                        fullsize: resp.size,
                        concsize: resp.size,
                        result_arf: 0,
                        result_relative_freq: 0
                    })
            ),
            map(data => ({
                concPersistenceID: data.conc_persistence_op_id,
                messages: data.messages,
                lines: convertLines(
                    data.Lines,
                    args.refs ?
                        List.map(
                            v => v.replace(/^=/, ''),
                            args.type === 'concQueryArgs' ? args.refs : args.refs.split(',')
                        ) :
                        undefined
                ),
                kwicNumTokens: data.Lines.length > 0 ? parseInt(data.Lines[0].kwiclen) : 1,
                concsize: data.concsize,
                arf: data.result_arf,
                ipm: data.result_relative_freq,
                query: args.type === 'concQueryArgs' ? List.head(args.queries).query : null, // TODO filter type?
                corpName: args.maincorp,
                subcorpName: args.usesubcorp
            }))
        );
    }
}