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

import * as Rx from '@reactivex/rxjs';
import { ActionDispatcher, ViewUtils } from 'kombo';
import { GlobalComponents } from '../views/global';
import { WdglanceMainFormModel } from '../models/query';
import { AppServices } from '../appServices';

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
    tileType:string;
    isHidden?:boolean;
    dependsOn?:string;
    label?:string;
}

/**
 * A configuration for a tile directly accessing
 * corpus data (typically via KonText API).
 */
export interface CorpSrchTileConf extends TileConf {

    corpname:string;

    subcname?:string;

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

    supportsExtendedView:boolean;

    supportsCurrQueryType:boolean;

    renderSize:[number, number];

    /**
     * Such a tile is invisible but its model
     * is active (i.e. it reacts to actions).
     */
    isHidden:boolean;

    /**
     * standard mode width in CSS grid fr units
     */
    widthFract:number;

    /**
     * extended mode width in CSS grid fr units
     */
    extWidthFract:number;
}

export type CoreTileComponentProps = {renderSize:[number, number]}

export type TileComponent = React.ComponentClass<CoreTileComponentProps>|React.SFC<CoreTileComponentProps>;

export interface ITileProvider {

    init():void;

    getLabel():string;

    getIdent():number;

    getView():TileComponent;

    isHidden():boolean;

    /**
     */
    supportsQueryType(qt:QueryType, lang1:string, lang2?:string):boolean;

    disable():void;

    getWidthFract():number;

    /**
     * If null then we assume no support
     * for extended mode.
     */
    getExtWidthFract():number|null;
}

/**
 *
 */
export namespace TileFactory {

    export interface Args<T> {
        tileId:number;
        dispatcher:ActionDispatcher;
        ut:ViewUtils<GlobalComponents>;
        appServices:AppServices;
        mainForm:WdglanceMainFormModel;
        lang1?:string;
        lang2?:string;
        waitForTile?:number;
        isHidden?:boolean;
        widthFract:number;
        conf:T;
    }

    export interface TileFactory<T> {
        (args:Args<T>):ITileProvider;
    }
}

/**
 *
 */
export interface DataApi<T, U> {
    call(queryArgs:T):Rx.Observable<U>;
}