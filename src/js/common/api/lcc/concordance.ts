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

import { IConcordanceApi, ViewMode, ConcResponse, LineElement } from '../abstract/concordance';
import { HTTPHeaders, IAsyncKeyValueStore, CorpusDetails } from '../../types';
import { ConcordanceMinState } from '../../models/concordance';
import { QueryMatch } from '../../query';
import { AnyQuery } from '../kontext/concordance';
import { Observable } from 'rxjs';
import { cachedAjax$ } from '../../ajax';
import { map } from 'rxjs/operators';
import { List, pipe, Dict } from 'cnc-tskit';
import { CorpusInfoAPI } from './corpusInfo';


export enum QuerySelector {
    BASIC = 'iqueryrow',
    CQL = 'cqlrow',
    LEMMA = 'lemmarow',
    WORD = 'wordrow',
    PHRASE = 'phraserow'
}


export interface RequestArgs extends AnyQuery {
    corpname:string;
    offset:number;
    limit:number;
}

interface Sentence {
    id:string;
    sentence:string;
    source:{
        id:string;
        url:string;
        date:string;
    };
}

interface HTTPResponse {
    count:number;
    sentences:Array<Sentence>;
}

function splitSentence(s:Sentence, word:string):[Array<LineElement>, Array<LineElement>, Array<LineElement>] {
    const lft:Array<LineElement> = [];
    const kwic:Array<LineElement> = [];
    const rgt:Array<LineElement> = [];
    const items = List.map(s => s.trim(), s.sentence.split(/\s+/));
    const wordIdx = List.findIndex(v => v.toLowerCase() === word.toLowerCase(), items);
    for (let i = 0; i < wordIdx; i++) {
        lft.push({type: 'str', str: items[i]});
    }
    if (wordIdx > -1) {
        kwic.push({type: 'coll', str: items[wordIdx]});
    }
    for (let i = wordIdx + 1; i < items.length; i++) {
        rgt.push({type: 'str', str: items[i]});
    }
    return [lft, kwic, rgt];
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

    getSupportedViewModes():Array<ViewMode> {
        return [ViewMode.SENT];
    }

    mkMatchQuery(lvar:QueryMatch, generator:[string, string]):string {
        return lvar.word;
    }

    stateToArgs(state:ConcordanceMinState, lvar:QueryMatch, lvarIdx:number, otherLangCql:string):RequestArgs {
        return {
            corpname: state.corpname,
            word: lvar ? lvar.word : state.concordances[lvarIdx].concId, // concId here is just the searched word
            offset: (state.concordances[lvarIdx].loadPage - 1) * state.pageSize,
            limit: state.pageSize
        };
    }

    call(args:RequestArgs):Observable<ConcResponse> {
        return cachedAjax$<HTTPResponse>(this.cache)(
            'GET',
            this.apiURL + `/sentences/${args.corpname}/sentences/${args.word}`,
            {
                offset: args.offset,
                limit: args.limit
            },
            {headers: this.customHeaders}

        ).pipe(
            map(
                (resp, i) => ({
                    query: args.word,
                    corpName: args.corpname,
                    subcorpName: args.usesubcorp,
                    lines: List.map(
                        v => {
                            const [lft, kwic, rgt] = splitSentence(v, args.word);
                            return {
                                left: lft,
                                kwic: kwic,
                                right: rgt,
                                toknum: args.offset + i, // this is just to satisfy WaG,
                                metadata: pipe(
                                    v.source,
                                    Dict.toEntries(),
                                    List.map(([k, v]) => ({value: v, label: k}))
                                )
                            };
                        },
                        resp.sentences
                    ),
                    concsize: resp.count,
                    ipm: -1, // TODO should be doable
                    arf: -1,
                    messages: [],
                    concPersistenceID: args.word
                })
            )
        )
    }

    getSourceDescription(tileId:number, uiLang:string, corpname:string):Observable<CorpusDetails> {
        return this.srcInfoService.call({
            tileId: tileId,
            corpname: corpname
        });
    }
}