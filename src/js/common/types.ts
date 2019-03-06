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

import {Observable} from 'rxjs';
import { ActionDispatcher, ViewUtils } from 'kombo';
import { GlobalComponents } from '../views/global';
import { WdglanceMainFormModel } from '../models/query';
import { AppServices } from '../appServices';
import { Theme } from './theme';

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

export type LocalizedConfMsg = string|{[lang:string]:string};

export interface Backlink {
    url:string;
    label:LocalizedConfMsg;
    method?:HTTPMethod;
}

export interface BacklinkWithArgs<T> {
    url:string;
    label:LocalizedConfMsg;
    args:AnyInterface<T>;
    method:HTTPMethod;
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
 * A configuration for a tile
 * provided by hosting page
 */
export interface TileConf {

    /**
     * An identifier as defined by tiles configuration interface
     */
    tileType:string;

    /**
     * An address providing a raw text or an HTML which will be
     * used as a help for the tile. Please make sure only trusted
     * sources are used here as the HTML is injected "as is" to
     * the page.
     */
    helpURL:string;

    /**
     * An optional link to an application the specific tile
     * represents (more or less). It is expected that the
     * tile logic is able to pass proper arguments to the
     * page.
     */
    backlink?:Backlink;

    /**
     * Normally, any tile configured in the "tiles" section
     * will be active no matter whether it is also in the
     * "layouts" section. This allows e.g. a hidden concordance
     * tile to ask for a concordance used by multiple visible
     * tiles (e.g. colloc, freqs.). To be able to keep possibly
     * usable items in the "tiles" configuration file it is
     * possible to disable them. I.e. in case a tile is disabled
     * it cannot be put in the layout without Wdglance complying
     * about invalid configuration.
     *
     */
    isDisabled?:boolean;

    /**
     * In case a tile supports this (most of them does so) it can
     * wait for a specific tile to finish its operation. Again,
     * this is used mainly for 'concordance -> analysis' combinations.
     */
    dependsOn?:string|Array<string>;

    /**
     * A label used in the header of the tile
     */
    label?:LocalizedConfMsg;
}

/**
 * An extended version of the basic tile configuration
 * directly accessing a single (sub)corpus (typically via KonText API).
 */
export interface CorpSrchTileConf extends TileConf {

    corpname:string;

    subcname?:string|Array<string>;

    subcDesc?:string|{[lang:string]:string};
}

/**
 * Tile properties extracted from
 * configuration/tile object/etc.
 * and passed to a respective React
 * component when rendering tile
 * containers.
 */
export interface TileFrameProps {

    tileId:number;

    Component:TileComponent;

    label:string;

    supportsTweakMode:boolean;

    supportsCurrQueryType:boolean;

    supportsHelpView:boolean;

    helpURL:string;

    renderSize:[number, number];

    /**
     * standard mode width in CSS grid fr units
     */
    widthFract:number;
}

/**
 * This type specifies required tile component properties
 * core components expected them to have.
 */
export interface CoreTileComponentProps {
    tileId:number;
    renderSize:[number, number];
    isMobile:boolean;
    widthFract:number;
}

/**
 * A general tile component.
 */
export type TileComponent = React.ComponentClass<CoreTileComponentProps>|React.SFC<CoreTileComponentProps>;

/**
 * ITileProvider specifes an object which encapsulates an implementation
 * of a tile as required by wdglance initialization process. Based on
 * values returned by these methods, wdglance will prepare all the properties
 * for React components and states for models.
 */
export interface ITileProvider {

    getLabel():string;

    getIdent():number;

    getView():TileComponent;

    /**
     */
    supportsQueryType(qt:QueryType, lang1:string, lang2?:string):boolean;

    disable():void;

    getWidthFract():number;

    supportsTweakMode():boolean;

    supportsHelpView():boolean;
}

/**
 * Each tile module must provide this factory
 * to allow wdglance create proper instance
 * of a respective tile.
 */
export namespace TileFactory {

    export interface Args<T> {
        tileId:number;
        dispatcher:ActionDispatcher;
        ut:ViewUtils<GlobalComponents>;
        theme:Theme,
        appServices:AppServices;
        mainForm:WdglanceMainFormModel;
        lang1?:string;
        lang2?:string;
        waitForTiles?:Array<number>;
        widthFract:number;
        conf:T;
    }

    export interface TileFactory<T> {
        (args:Args<T>):ITileProvider;
    }
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


export type DbValueMapping = {[corp:string]:{[key:string]:LocalizedConfMsg}};


export interface HostPageEnv {
    styles:Array<string>;
    scripts:Array<string>;
    html:string|null;
    toolbarHeight:string|null; // a CSS value
}

export interface IToolbarProvider {
    get():Observable<HostPageEnv|null>;
}

export type HTTPHeaders = {[key:string]:string};