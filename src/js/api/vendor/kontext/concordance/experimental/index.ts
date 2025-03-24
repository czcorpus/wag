/*
 * Copyright 2025 Tomas Machalek <tomas.machalek@gmail.com>
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
import { map, Observable, tap } from 'rxjs';
import { List, HTTP, URL, tuple } from 'cnc-tskit';

import { ajax$ } from '../../../../../page/ajax.js';
import { CorpusDetails, WebDelegateApi } from '../../../../../types.js';
import { QueryMatch } from '../../../../../query/index.js';
import { ConcResponse, ViewMode, IConcordanceApi } from '../../../../abstract/concordance.js';
import { ConcordanceMinState } from '../../../../../models/tiles/concordance/index.js';
import { CorpusInfoAPI } from '../../corpusInfo.js';
import { IApiServices } from '../../../../../appServices.js';
import { ConcViewResponse, convertLines, mkLemmaMatchQuery, mkWordMatchQuery, PersistentConcArgs} from '../v015/common.js';
import { ConcQueryArgs } from '../../types.js';
import { Backlink } from '../../../../../page/tile.js';



/**
 * ConcApiSimplified expects queries to be handled by APIGuard which will
 * perform additional 'view' action by itself. I.e. this API client sends
 * `query_submit` and expects response of KonText's `view`.
 */
export class ConcApiSimplified implements IConcordanceApi<ConcQueryArgs>, WebDelegateApi {

    protected readonly apiURL:string;

    protected readonly useDataStream:boolean;

    private readonly srcInfoService:CorpusInfoAPI;

    protected readonly apiServices:IApiServices;

    constructor(apiURL:string, useDataStream:boolean, apiServices:IApiServices) {
        this.apiURL = apiURL;
        this.useDataStream = useDataStream;
        this.apiServices = apiServices;
        this.srcInfoService = new CorpusInfoAPI(apiURL, apiServices);
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

    getSourceDescription(tileId:number, multicastRequest:boolean, lang:string, corpname:string):Observable<CorpusDetails> {
        return this.srcInfoService.call(tileId, multicastRequest, {
            corpname: corpname,
            format: 'json'
        });
    }

    stateToArgs(state:ConcordanceMinState, lvar:QueryMatch, lvarIdx:number, otherLangCql:string):ConcQueryArgs {
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
    }

    /**
     * Create an action URL, action content type and action body args object based
     * on provided API args.
     */
    private createActionUrl(args:ConcQueryArgs):[string, string, unknown] {
        return tuple(URL.join(this.apiURL, 'query_submit'), 'application/json', args);
    }

    call(tileId:number, multicastRequest:boolean, args:ConcQueryArgs):Observable<ConcResponse> {
        const [url, contentType, argsBody] = this.createActionUrl(args);
        const headers = this.apiServices.getApiHeaders(this.apiURL);
        headers['X-Is-Web-App'] = '1';
        return (
            this.useDataStream ?
            this.apiServices.dataStreaming().registerTileRequest<ConcViewResponse>(
                multicastRequest,
                {
                    tileId,
                    method: HTTP.Method.POST,
                    url,
                    body: argsBody,
                    contentType: 'application/json',
                    base64EncodeResult: false
                }
            )
            : ajax$<ConcViewResponse>(
                HTTP.Method.POST,
                url,
                argsBody,
                {
                    headers,
                    withCredentials: true,
                    contentType
                }
            )
        ).pipe(
            map(data => ({
                concPersistenceID: data.conc_persistence_op_id,
                messages: data.messages,
                lines: convertLines(
                    data.Lines,
                    args.refs ?
                        List.map(
                            v => v.replace(/^=/, ''),
                            args.refs
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
        )
    }

    getBackLink(backlink:Backlink):Backlink {
        return {
            label: 'KonText',
            method: HTTP.Method.GET,
            ...(backlink || {}),
            url: (backlink?.url ? backlink.url : this.apiURL) + '/view',
        }
    }
}