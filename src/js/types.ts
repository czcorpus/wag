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
import { SourceCitation } from './api/abstract/sourceInfo';


export type AnyInterface<T> = {
    [P in keyof T]: T[P];
};

export type ListOfPairs = Array<[string, string|number]>;

export enum SystemMessageType {
    INFO = 'info',
    WARNING = 'warning',
    ERROR = 'error'
}

export enum CorePosAttribute {
    WORD = 'word',
    LEMMA = 'lemma'
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

/**
 * ResourceApi describes a resource API which is
 * able to provide additional information about itself.
 */
export interface ResourceApi<T, U> extends DataApi<T, U> {

    getSourceDescription(tileId:number, lang:string, corpname:string):Observable<SourceDetails>;
}


export type LocalizedConfMsg = string|{[lang:string]:string};


export type HTTPHeaders = {[key:string]:string};


export interface SourceDetails {
    tileId:number;
    title:string;
    description:string;
    author:string;
    href?:string;
    citationInfo?:SourceCitation;
    keywords?:Array<{name:string, color:string}>;
}

export interface CorpusDetails extends SourceDetails {
    structure:{
        numTokens:number;
        numSentences?:number;
        numParagraphs?:number;
        numDocuments?:number;
    }
}

export function isCorpusDetails(d:SourceDetails):d is CorpusDetails {
    return typeof d['structure'] === 'object' && d['structure'].numTokens !== undefined;
}

export interface IAsyncKeyValueStore {
    get<T>(key:string):Observable<T>;
    set(key:string, value:any):Observable<string>;
    clearAll():Observable<number>;
}

export interface TelemetryAction {
    timestamp:number;
    actionName:string;
    tileName:string;
    isSubquery:boolean;
    isMobile:boolean;
}

export type TileIdentMap = {[ident:string]:number};

export interface PackageInfo {
    version:string;
    repository:{
        url:string
    };
}
