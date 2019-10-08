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

import { QuerySelector} from '../../api/kontext/concordance';
import { ViewMode } from '../../api/abstract/concordance';


export interface ConcordanceMinState {
    tileId:number;
    querySelector:QuerySelector;
    corpname:string;
    otherCorpname:string;
    subcname:string;
    subcDesc:string;
    kwicLeftCtx:number;
    kwicRightCtx:number;
    pageSize:number;
    currPage:number;
    loadPage:number; // the one we are going to load
    attr_vmode:'mouseover'|'direct';
    viewMode:ViewMode;
    concId:string|null;
    shuffle:boolean;
    metadataAttrs:Immutable.List<{value:string; label:string}>;
    attrs:Immutable.List<string>;
    posQueryGenerator:[string, string];
}