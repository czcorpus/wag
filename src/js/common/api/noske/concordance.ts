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

import { IConcordanceApi, ViewMode, ConcResponse, Line } from '../abstract/concordance';
import { HTTPHeaders, IAsyncKeyValueStore } from '../../types';
import { CorpusInfoAPI, APIResponse as CorpusInfoApiResponse } from './corpusInfo';
import { ConcordanceMinState } from '../../models/concordance';
import { QueryMatch } from '../../query';
import { AnyQuery } from '../kontext/concordance';
import { Observable } from 'rxjs';
import { cachedAjax$ } from '../../ajax';
import { map } from 'rxjs/operators';
import { posQueryFactory } from '../../postag';
import { List, pipe } from 'cnc-tskit';


export enum QuerySelector {
    BASIC = 'iqueryrow',
    CQL = 'cqlrow',
    LEMMA = 'lemmarow',
    WORD = 'wordrow',
    PHRASE = 'phraserow'
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
    default_attr:string;
    shuffle?:number;
    refs?:string;
    q?:Array<string>; // here we modify an existing concordance
    format:'json';
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

export interface ConcLine {
    Left:Array<{'class':string; str:string}>;
    Kwic:Array<{'class':string; str:string}>;
    Right:Array<{'class':string; str:string}>;
    hitlen:number;
    ref:string;
    toknum:number;
    linegroup:string;
    Tbl_refs:Array<string>;
}

export interface HTTPResponse {
    corpname:string;
    concsize:number;
    relsize:number; // ipm
    Lines:Array<ConcLine>;
    Desc:Array<{
        nicearg:string;
        tourl:string;
        rel:number;
        arg:string;
        op:string;
        size:number;
    }>;
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

function escapeVal(v:string) {
    return v.replace(/"/, '\\"');
}

function mkLemmaMatchQuery(lvar:QueryMatch, generator:[string, string]):string {
    const fn = posQueryFactory(generator[1]);
    const posPart = lvar.pos.length > 0 ?
        ' & (' + lvar.pos.map(v => `${generator[0]}="${fn(v.value)}"`).join(' | ') + ')' :
        '';
    return `[lemma="${escapeVal(lvar.lemma)}" ${posPart}]`;
}

function mkWordMatchQuery(lvar:QueryMatch):string {
    return lvar.word.split(' ').map(word => `[word="${escapeVal(word)}"]`).join('');
}

export function mkMatchQuery(lvar:QueryMatch, generator:[string, string]):string {
    if (lvar.pos.length > 0) {
        return mkLemmaMatchQuery(lvar, generator);

    } else if (lvar.word) {
        return mkWordMatchQuery(lvar);
    }
}

function convertLines(lines:Array<ConcLine>, metadataAttrs?:Array<string>):Array<Line> {
    return lines.map(line => ({
        left: line.Left,
        kwic: line.Kwic,
        right: line.Right,
        align: [], // TODO
        toknum: line.toknum,
        metadata: [{value: line.ref, label: 'metadata'}]
    }));
}

export class ConcApi implements IConcordanceApi<RequestArgs> {

    private readonly apiURL:string;

    private readonly customHeaders:HTTPHeaders;

    private readonly cache:IAsyncKeyValueStore;

    private readonly srcInfoService:CorpusInfoAPI;


    constructor(cache:IAsyncKeyValueStore, apiURL:string, customHeaders?:HTTPHeaders) {
        this.apiURL = apiURL;
        this.customHeaders = customHeaders || {};
        this.cache = cache;
        this.srcInfoService = new CorpusInfoAPI(cache, apiURL, customHeaders);
    }

    stateToArgs(state:ConcordanceMinState, lvar:QueryMatch, lvarIdx:number, otherLangCql:string):RequestArgs {
        const ans:RequestArgs = {
            corpname: state.corpname,
            usesubcorp: state.subcname,
            queryselector: state.querySelector,
            kwicleftctx: (-1 * state.kwicLeftCtx).toFixed(),
            kwicrightctx: state.kwicRightCtx.toFixed(),
            async: '0',
            pagesize: state.pageSize.toFixed(),
            fromp: state.concordances[lvarIdx].loadPage.toFixed(),
            attr_vmode: state.attr_vmode,
            attrs: state.attrs.join(','),
            refs: state.metadataAttrs.map(v => '=' + v.value).join(','),
            viewmode: state.viewMode,
            shuffle: state.shuffle ? 1 : undefined,
            default_attr: 'word', // TODO configurable
            format:'json'
        };
        if (lvar) {
            setQuery(ans, mkMatchQuery(lvar, state.posQueryGenerator));

        } else {
            ans.q = pipe(
                state.concordances[lvarIdx].concId.split('&'),
                List.map(v => v.split('=').slice(0, 2)),
                List.filter(([k, v]) => k === 'q'),
                List.map(([,v]) => decodeURIComponent(v).replace(/\++/g, ' '))
            );
        }
        return ans;
    }

    private createActionUrl(args:RequestArgs|FilterRequestArgs):string {
        return this.apiURL + '/' + (args.q ? 'view' : 'first');
    }

    call(args:RequestArgs|FilterRequestArgs):Observable<ConcResponse> {
        return cachedAjax$<HTTPResponse>(this.cache)(
            'GET',
            this.createActionUrl(args),
            args,
            {headers: this.customHeaders}

        ).pipe(
            map(
                resp => ({
                    query: '',
                    corpName: resp.corpname,
                    subcorpName: args.usesubcorp,
                    lines: convertLines(resp.Lines),
                    concsize: resp.concsize,
                    ipm: resp.relsize,
                    arf: -1,
                    messages: [],
                    concPersistenceID: resp.Desc[resp.Desc.length - 1].tourl
                })
            )
        )
    }

    getSourceDescription(tileId:number, uiLang:string, corpname:string):Observable<CorpusInfoApiResponse> {
        return this.srcInfoService.call({
            tileId: tileId,
            corpname: corpname,
            format: 'json'
        });
    }
}