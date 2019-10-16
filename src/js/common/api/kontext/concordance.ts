/*
 * Copyright 2018 Tomas Machalek <tomas.machalek@gmail.com>
 * Copyright 2018 Institute of the Czech National Corpus,
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

import { cachedAjax$ } from '../../ajax';
import { HTTPHeaders, IAsyncKeyValueStore } from '../../types';
import { LemmaVariant } from '../../query';
import { posQueryFactory } from './posQuery';
import { Line, ConcResponse, ViewMode, LineElement, IConcordanceApi } from '../abstract/concordance';
import { ConcordanceMinState } from '../../models/concordance';
import { CorpusInfoAPI, APIResponse as CorpusInfoApiResponse } from './corpusInfo';



export enum QuerySelector {
    BASIC = 'iqueryrow',
    CQL = 'cqlrow',
    LEMMA = 'lemmarow',
    WORD = 'wordrow',
    PHRASE = 'phraserow'
}

export interface AnyQuery {
    queryselector?:QuerySelector;
    usesubcorp?:string;
    iquery?:string;
    lemma?:string;
    cql?:string;
    word?:string;
    phrase?:string;
}

export enum PCQValue {
    POS = 'pos',
    NET = 'neg'
}

export interface RequestArgs extends AnyQuery {
    corpname:string;
    kwicleftctx:string;
    kwicrightctx:string;
    async:string;
    pagesize:string;
    fromp:string;
    attr_vmode:string;
    attrs:string;
    viewmode:ViewMode;
    shuffle?:number;
    refs?:string;
    q?:string; // here we modify an existing concordance
    format:'json';
}

export interface QuickFilterRequestArgs extends RequestArgs {
    q2:string;
}

export enum PNFilter {
    POS = 'p',
    NEG = 'n'
}

export interface FilterRequestArgs extends RequestArgs {
    pnfilter:PNFilter;
    filfl:'f';
    filfpos:number;
    filtpos:number;
    inclkwic:number;
}

export interface PCRequestArgs extends RequestArgs {
    maincorp:string;
    align:string;
    [parg:string]:string|number;
}

export interface FilterPCRequestArgs extends RequestArgs {
    pnfilter:PNFilter;
    filfl:'f';
    filfpos:number;
    filtpos:number;
    inclkwic:number;
    maincorp:string;
    align:string;
    [parg:string]:string|number;
}

interface KontextLine {
    Left:Array<LineElement>;
    Kwic:Array<LineElement>;
    Right:Array<LineElement>;
    Align?:Array<{
        Left:Array<LineElement>;
        Kwic:Array<LineElement>;
        Right:Array<LineElement>;
        toknum:number;
    }>;
    toknum:number;
    ref:Array<string>;
    interactionId?:string;
    isHighlighted?:boolean;
}

export interface HTTPResponse {
    conc_persistence_op_id:string;
    messages:Array<[string, string]>;
    Lines:Array<KontextLine>;
    fullsize:number;
    concsize:number;
    result_arf:number;
    result_relative_freq:number;
}

export const getQuery = (args:AnyQuery):string => {
    switch (args.queryselector) {
        case QuerySelector.BASIC:
            return args.iquery;
        case QuerySelector.CQL:
            return args.cql;
        case QuerySelector.LEMMA:
            return args.lemma;
        case QuerySelector.WORD:
            return args.word;
        case QuerySelector.PHRASE:
            return args.phrase;
        default:
            throw new Error(`Unsupported query selector ${args.queryselector}`);
    }
};


const escapeVal = (v:string) => v.replace(/"/, '\\"');

function mkLemmaMatchQuery(lvar:LemmaVariant, generator:[string, string]):string {
    const fn = posQueryFactory(generator[1]);
    const posPart = lvar.pos.length > 0 ?
        ' & (' + lvar.pos.map(v => `${generator[0]}="${fn(v.value)}"`).join(' | ') + ')' :
        '';
    return `[lemma="${escapeVal(lvar.lemma)}" ${posPart}]`; // TODO escape stuff !!!
}

function mkWordMatchQuery(lvar:LemmaVariant):string {
    return `[word="${escapeVal(lvar.word)}"]`;
}

export function mkMatchQuery(lvar:LemmaVariant, generator:[string, string]):string {
    if (lvar.pos.length > 0) {
        return mkLemmaMatchQuery(lvar, generator);

    } else if (lvar.word) {
        return mkWordMatchQuery(lvar);
    }
}

export const setQuery = (args:AnyQuery, q:string):void => {
    switch (args.queryselector) {
        case QuerySelector.BASIC:
            args.iquery = q;
        break;
        case QuerySelector.CQL:
            args.cql = q;
        break;
        case QuerySelector.LEMMA:
            args.lemma = q;
        break;
        case QuerySelector.WORD:
            args.word = q;
        break;
        case QuerySelector.PHRASE:
            args.phrase = q;
        break;
        default:
            throw new Error(`Unsupported query selector ${args.queryselector}`);
    }
}





export function convertLines(lines:Array<KontextLine>, metadataAttrs?:Array<string>):Array<Line> {
    return lines.map(line => ({
        left: line.Left,
        kwic: line.Kwic,
        right: line.Right,
        align: (line.Align || []).map(al => ({
            left: al.Left,
            kwic: al.Kwic,
            right: al.Right,
            toknum: al.toknum
        })),
        toknum: line.toknum,
        metadata: (line.ref || []).map((v, i) => ({
            value: v,
            label: metadataAttrs ? metadataAttrs[i] : '--'
        }))
    }));
}


export class ConcApi implements IConcordanceApi<RequestArgs> {

    private readonly apiURL:string;

    private readonly customHeaders:HTTPHeaders;

    private readonly cache:IAsyncKeyValueStore;

    private readonly srcInfoService:CorpusInfoAPI;

    private readonly isFilterMode:boolean;

    constructor(filterMode:boolean, cache:IAsyncKeyValueStore, apiURL:string, customHeaders?:HTTPHeaders) {
        this.isFilterMode = filterMode;
        this.apiURL = apiURL;
        this.customHeaders = customHeaders || {};
        this.cache = cache;
        this.srcInfoService = new CorpusInfoAPI(cache, apiURL, customHeaders);
    }

    stateToArgs(state:ConcordanceMinState, lvar:LemmaVariant, otherLangCql:string):RequestArgs {
        if (state.otherCorpname) {
            const ans:PCRequestArgs = {
                corpname: state.corpname,
                maincorp: state.corpname,
                align: state.otherCorpname,
                usesubcorp: state.subcname,
                queryselector: state.querySelector,
                kwicleftctx: (-1 * state.kwicLeftCtx).toFixed(),
                kwicrightctx: state.kwicRightCtx.toFixed(),
                async: '0',
                pagesize: state.pageSize.toFixed(),
                fromp: state.loadPage.toFixed(),
                attr_vmode: state.attr_vmode,
                attrs: state.attrs.join(','),
                viewmode: state.viewMode,
                shuffle: state.shuffle ? 1 : undefined,
                format:'json'
            };
            ans[`pcq_pos_neg_${state.otherCorpname}`] = PCQValue.POS;
            ans[`include_empty_${state.otherCorpname}`] = '0';
            ans[`queryselector_${state.otherCorpname}`] = 'cqlrow';
            ans[`cql_${state.otherCorpname}`] = otherLangCql || '';
            if (lvar) {
                setQuery(ans, mkMatchQuery(lvar, state.posQueryGenerator));

            } else {
                ans.q = `~${state.concId}`;
            }
            return ans;

        } else {
            const ans:RequestArgs = {
                corpname: state.corpname,
                usesubcorp: state.subcname,
                queryselector: state.querySelector,
                kwicleftctx: (-1 * state.kwicLeftCtx).toFixed(),
                kwicrightctx: state.kwicRightCtx.toFixed(),
                async: '0',
                pagesize: state.pageSize.toFixed(),
                fromp: state.loadPage.toFixed(),
                attr_vmode: state.attr_vmode,
                attrs: state.attrs.join(','),
                refs: state.metadataAttrs.map(v => '=' + v.value).join(','),
                viewmode: state.viewMode,
                shuffle: state.shuffle ? 1 : undefined,
                format:'json'
            };
            if (lvar) {
                setQuery(ans, mkMatchQuery(lvar, state.posQueryGenerator));

            } else {
                ans.q = `~${state.concId}`;
            }
            return ans;
        }
    }

    getSourceDescription(tileId:number, uiLang:string, corpname:string):Observable<CorpusInfoApiResponse> {
        return this.srcInfoService.call({
            tileId: tileId,
            corpname: corpname,
            format: 'json'
        });
    }

    private createActionUrl(args:RequestArgs|PCRequestArgs|FilterRequestArgs):string {
        if (this.isFilterMode) {
            return this.apiURL + '/quick_filter';
        }
        return this.apiURL + '/' + (args.q ? 'view' : 'first');
    }

    call(args:RequestArgs|PCRequestArgs|FilterRequestArgs):Observable<ConcResponse> {
        return cachedAjax$<HTTPResponse>(this.cache)(
            'GET',
            this.createActionUrl(args),
            args,
            {headers: this.customHeaders}

        ).pipe(
            map(data => ({
                concPersistenceID: data.conc_persistence_op_id,
                messages: data.messages,
                lines: convertLines(
                    data.Lines,
                    args.refs ?
                        args.refs.split(',').map(v => v.replace(/^=/, '')) :
                        undefined
                ),
                concsize: data.concsize,
                arf: data.result_arf,
                ipm: data.result_relative_freq,
                query: getQuery(args),
                corpName: args.corpname,
                subcorpName: args.usesubcorp
            }))
        );
    }
}