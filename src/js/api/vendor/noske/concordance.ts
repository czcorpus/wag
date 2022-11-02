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

import { IConcordanceApi, ViewMode, ConcResponse, Line, LineElementType } from '../../abstract/concordance';
import { IAsyncKeyValueStore, CorpusDetails } from '../../../types';
import { CorpusInfoAPI } from './corpusInfo';
import { ConcordanceMinState } from '../../../models/tiles/concordance';
import { QueryMatch } from '../../../query';
import { Observable } from 'rxjs';
import { cachedAjax$ } from '../../../page/ajax';
import { map } from 'rxjs/operators';
import { posQueryFactory } from '../../../postag';
import { List, pipe } from 'cnc-tskit';
import { HTTPApiResponse, processConcId } from './common';
import { IApiServices } from '../../../appServices';


export enum QuerySelector {
    BASIC = 'iqueryrow',
    CQL = 'cqlrow',
    LEMMA = 'lemmarow',
    WORD = 'wordrow',
    PHRASE = 'phraserow'
}

interface AnyQuery {
    queryselector?:QuerySelector;
    usesubcorp?:string;
    iquery?:string;
    lemma?:string;
    cql?:string;
    word?:string;
    phrase?:string;
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

interface HTTPResponse extends HTTPApiResponse {
    request:{corpname:string};
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

/**
 * Transform a provided QueryMatch into a valid CQL query.
 *
 * a) lemma with a PoS information like e.g.: lemma='foo bar', tag=['A', 'B']
 * is transformed into: [lemma="foo" & tag="A"] [lemma="bar" & tag="B"].
 * b) lemma without a PoS information, e.g.: lemma='foo bar'
 * is transformed into: [lemma="foo"] [lemma="bar"]
 */
function mkLemmaMatchQuery(lvar:QueryMatch, generator:[string, string]):string {

    const fn = posQueryFactory(generator[1]);
    return pipe(
        lvar.lemma.split(' '),
        List.map((lemma, i) => lvar.pos[i] !== undefined ?
            `[lemma="${escapeVal(lemma)}" & ${generator[0]}="${fn(lvar.pos[i].value)}"]` :
            `[lemma="${escapeVal(lemma)}"]`)
    ).join(' ');
}

function mkWordMatchQuery(lvar:QueryMatch):string {
    return lvar.word.split(' ').map(word => `[word="${escapeVal(word)}"]`).join('');
}

function convertLines(lines:Array<ConcLine>, metadataAttrs?:Array<string>):Array<Line> {
    return List.map(
        line => ({
            left: List.map(
                v => ({type: v.class as LineElementType, str: v.str}),
                line.Left
            ),
            kwic: List.map(
                v => ({type: v.class as LineElementType, str: v.str}),
                line.Kwic
            ),
            right: List.map(
                v => ({type: v.class as LineElementType, str: v.str}),
                line.Right
            ),
            align: [], // TODO
            toknum: line.toknum,
            metadata: [{value: line.ref, label: 'metadata'}]
        }),
        lines
    );
}

export class ConcApi implements IConcordanceApi<RequestArgs> {

    private readonly apiURL:string;

    private readonly apiServices:IApiServices;

    private readonly cache:IAsyncKeyValueStore;

    private readonly srcInfoService:CorpusInfoAPI;


    constructor(cache:IAsyncKeyValueStore, apiURL:string, apiServices:IApiServices) {
        this.apiURL = apiURL;
        this.apiServices = apiServices;
        this.cache = cache;
        this.srcInfoService = new CorpusInfoAPI(cache, apiURL, apiServices);
    }

    getSupportedViewModes():Array<ViewMode> {
        return [ViewMode.KWIC, ViewMode.SENT];
    }

    mkMatchQuery(lvar:QueryMatch, generator:[string, string]):string {
        if (lvar.pos.length > 0) {
            return mkLemmaMatchQuery(lvar, generator);

        } else if (lvar.word) {
            return mkWordMatchQuery(lvar);
        }
    }

    stateToArgs(state:ConcordanceMinState, lvar:QueryMatch, lvarIdx:number, otherLangCql:string):RequestArgs {
        const ans:RequestArgs = {
            corpname: state.corpname,
            usesubcorp: state.subcname,
            queryselector: QuerySelector.CQL,
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
            setQuery(ans, this.mkMatchQuery(lvar, state.posQueryGenerator));

        } else {
            ans.q = processConcId(state.concordances[lvarIdx].concId);
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
            {headers: this.apiServices.getApiHeaders(this.apiURL)}

        ).pipe(
            map(
                resp => ({
                    query: '',
                    corpName: resp.request.corpname,
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

    getSourceDescription(tileId:number, lang:string, corpname:string):Observable<CorpusDetails> {
        return this.srcInfoService.call({
            tileId: tileId,
            corpname: corpname,
            struct_attr_stats: 1,
            subcorpora: 1,
            format: 'json'
        });
    }
}