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
import { ViewUtils } from 'kombo';
import { Observable } from 'rxjs';
import * as React from 'react';
import * as Immutable from 'immutable';

import { GlobalComponents } from '../views/global';


export type AnyInterface<T> = {
    [P in keyof T]: T[P];
};

export interface IMultiDict {
    getFirst(key:string):string;
    getList(key:string):Array<string>;
    set(key:string, value:number|boolean|string):void;
    add(key:string, value:any):void;
    replace(key:string, values:Array<string>);
    remove(key:string):void;
    items():Array<[string, string]>;
    has(key:string):boolean;
}

export type ListOfPairs = Array<[string, string|number]>;

export enum HTTPMethod {
    GET = 'GET',
    HEAD = 'HEAD',
    POST = 'POST',
    PUT = 'PUT',
    DELETE = 'DELETE',
    CONNECT = 'CONNECT',
    OPTIONS = 'OPTIONS',
    TRACE = 'TRACE',
    PATCH = 'PATCH'
}

export interface ScreenProps {
    isMobile:boolean;
    innerWidth:number;
    innerHeight:number;
}


export enum SystemMessageType {
    INFO = 'info',
    WARNING = 'warning',
    ERROR = 'error'
}

export enum CorePosAttribute {
    WORD = 'word',
    LEMMA = 'lemma'
}

export enum QueryType {
    SINGLE_QUERY = 'single',
    CMP_QUERY = 'cmp',
    TRANSLAT_QUERY = 'translat'
}


/**
 * A general data api. While in most cases
 * the solution of such an API is an internal
 * issue of a respective tile, sometimes it
 * is useful to share such API libraries.
 */
export interface DataApi<T, U> {

    call(queryArgs:T):Observable<U>;
}


export type LocalizedConfMsg = string|{[lang:string]:string};


export type DbValueMapping = {[corp:string]:{[key:string]:LocalizedConfMsg}};


export interface AvailableLanguage {
    code:string;
    label:string;
}

export type ToolbarView = React.ComponentClass<{
    languages:Immutable.List<AvailableLanguage>;
    uiLang:string;
    returnUrl:string;
}>;

export interface HostPageEnv {
    styles:Array<string>;
    scripts:Array<string>;
    html:string|ToolbarView|null;
    toolbarHeight:string|null; // a CSS value
}

export interface IToolbarProvider {
    get(uiLang:string, returnUrl:string, ut:ViewUtils<GlobalComponents>):Observable<HostPageEnv|null>;
}

export type HTTPHeaders = {[key:string]:string};

export interface SubQueryItem {
    value:string;
    interactionId?:string;
    color?:string;
}

export interface SubqueryPayload {
    tileId:number;
    subqueries:Array<SubQueryItem>;
    lang1:string;
    lang2:string;
}

export function isSubqueryPayload(payload:{}):payload is SubqueryPayload {
    return Array.isArray(payload['subqueries']);
}


export interface LemmaVariant {
    lemma:string;
    word:string;
    pos:QueryPoS;
    posLabel:string;
    abs:number;
    ipm:number;
    arf:number;
    flevel:number;
    isCurrent:boolean;
}

export enum QueryPoS {
    NOUN = 'N',
    ADJECTIVE = 'A',
    PRONOUN = 'P',
    NUMERAL = 'C',
    VERB = 'V',
    ADVERB = 'D',
    PREPOSITION = 'R',
    CONJUNCTION = 'J',
    PARTICLE = 'T',
    INTERJECTION = 'I',
    PUNCTUATION = 'Z',
    UNKNOWN = 'X'
}

export const importQueryPos = (s:string):QueryPoS => {
    if (['n', 'a', 'p', 'c', 'v', 'd', 'r', 'j', 't', 'i', 'z', 'x'].indexOf(s.toLowerCase()) > -1) {
        return s.toUpperCase() as QueryPoS;
    }
    throw new Error(`Invalid PoS value [${s}]`);
};


export interface SearchLanguage {
    ident:string;
    label:string;
}


export interface SourceDetails {
    tileId:number;
    title:string;
    description:string;
    author:string;
}