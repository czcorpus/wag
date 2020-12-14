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

export enum PCQValue {
    POS = 'pos',
    NET = 'neg'
}

export type QueryType = 'simple'|'advanced';

export type SubmitEncodedSimpleTokens = Array<
    [
        Array<
            [string|Array<string>, string]
        >,
        boolean
    ]
>;

export type AttrViewMode = 'visible-all'|'visible-kwic'|'visible-multiline'|'mouseover';

/**
 * SimpleQuerySubmit is a form of SimpleQuery as submitted to server
 */
export interface SimpleQuerySubmit {
    corpname:string;
    qtype:'simple';
    query:string;
    queryParsed:SubmitEncodedSimpleTokens;
    qmcase:boolean;
    pcq_pos_neg:string;
    include_empty:boolean;
    default_attr:string;
    use_regexp:boolean;
}

/**
 * AdvancedQuerySubmit is a form of AdvancedQuery as submitted to server
 */
export interface AdvancedQuerySubmit {
    corpname:string;
    qtype:'advanced';
    query:string;
    pcq_pos_neg:string;
    include_empty:boolean;
    default_attr:string;
}

export type AnyQuerySubmit = SimpleQuerySubmit|AdvancedQuerySubmit;

export type ExportedSelection = {[sca:string]:Array<string>|string};

export interface QueryContextArgs {
    fc_lemword_window_type:string;
    fc_lemword_wsize:number;
    fc_lemword:string;
    fc_lemword_type:string;
    fc_pos_window_type:string;
    fc_pos_wsize:number;
    fc_pos:string[];
    fc_pos_type:string;
}

export interface ConcSubmitArgs {
    queries:Array<AnyQuerySubmit>;
    maincorp:string|null;
    usesubcorp:string|null;
    viewmode:'kwic'|'sen'|'align';
    pagesize:number;
    shuffle:0|1;
    attrs:Array<string>;
    ctxattrs:Array<string>;
    attr_vmode:AttrViewMode;
    base_viewattr:string;
    structs:Array<string>;
    refs:Array<string>;
    fromp:number;
    text_types:ExportedSelection;
    context:QueryContextArgs;
}

export interface ConcQueryArgs extends ConcSubmitArgs {
    kwicleftctx:number;
    kwicrightctx:number;
    type:'concQueryArgs';
}

export interface ConcViewArgsBase {
    corpname:string;
    usesubcorp?:string;
    maincorp?:string;
    kwicleftctx:string;
    kwicrightctx:string;
    pagesize:string;
    fromp:string;
    attr_vmode:AttrViewMode;
    attrs:string;
    viewmode:'kwic'|'sen'|'align';
    shuffle?:number;
    refs?:string;
    q:string; // here we modify an existing concordance
    format:'json';
}

export interface ConcViewArgs extends ConcViewArgsBase {
    type: 'concViewArgs';
}

export interface FilterServerArgs extends ConcViewArgsBase {
    pnfilter:string;
    filfl:string;
    filfpos:string;
    filtpos:string;
    inclkwic:0|1;
    qtype:QueryType;
    query:string;
    qmcase:boolean;
    within:boolean;
    default_attr:string;
    use_regexp:boolean;
    type:'filterQueryArgs';
}

export interface QuickFilterRequestArgs extends ConcViewArgsBase {
    type:'quickFilterQueryArgs';
    q2:string;
}

export enum PNFilter {
    POS = 'p',
    NEG = 'n'
}

export interface FilterRequestArgs extends ConcViewArgsBase {
    pnfilter:PNFilter;
    filfl:'f';
    filfpos:number;
    filtpos:number;
    inclkwic:number;
}

export interface PCRequestArgs extends ConcViewArgs {
    maincorp:string;
    align:string;
    [parg:string]:string|number;
}

export interface FilterPCRequestArgs extends ConcViewArgsBase {
    type:'filterPCRequestArgs';
    pnfilter:PNFilter;
    filfl:'f';
    filfpos:number;
    filtpos:number;
    inclkwic:number;
    maincorp:string;
    align:string;
    [parg:string]:string|number;
}
