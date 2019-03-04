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

import * as Immutable from 'immutable';
import { QuerySelector, ViewMode, RequestArgs, setQuery, PCRequestArgs, PCQValue } from "../api/concordance";


export interface ConcordanceMinState {
    querySelector:QuerySelector;
    corpname:string;
    otherCorpname:string;
    subcname:string;
    kwicLeftCtx:number;
    kwicRightCtx:number;
    pageSize:number;
    loadPage:number; // the one we are going to load
    attr_vmode:'mouseover';
    viewMode:ViewMode;
    tileId:number;
    shuffle:boolean;
    attrs:Immutable.List<string>;
}



export const stateToArgs = (state:ConcordanceMinState, query:string):RequestArgs|PCRequestArgs => {
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
        ans[`queryselector_${state.otherCorpname}`] = 'wordrow';
        ans[`word_${state.otherCorpname}`] = '';
        setQuery(ans, query);
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
            viewmode: state.viewMode,
            shuffle: state.shuffle ? 1 : undefined,
            format:'json'
        };
        setQuery(ans, query);
        return ans;
    }
}