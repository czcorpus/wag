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
import { Action } from 'kombo';


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


export type LocalizedConfMsg = string|{[lang:string]:string};


export type DbValueMapping = {[corp:string]:{[key:string]:LocalizedConfMsg}};


export type HTTPHeaders = {[key:string]:string};


export interface SourceDetails {
    tileId:number;
    title:string;
    description:string;
    author:string;
    href?:string;
}


export interface TileError {
    message:string;
    retryAction:Action;
}


export interface IAsyncKeyValueStore {
    get<T>(key:string):Observable<T>;
    set(key:string, value:any):Observable<string>;
    clearAll():Observable<number>;
}

export type RGBAColor = [number, number, number, number];


export interface TelemetryAction {
    timestamp:number;
    actionName:string;
    tileName:string;
    isSubquery:boolean;
    isMobile:boolean;
}


export type TileIdentMap = {[ident:string]:number};