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

export interface TileConf {
    tileType:string;
    isHidden?:boolean;
    dependsOn?:string;
    label?:string;
}

export type CoreTileComponentProps = {renderSize:[number, number]}

export type TileComponent = React.ComponentClass<CoreTileComponentProps>|React.SFC<CoreTileComponentProps>;

export interface ITileProvider {

    init():void;
    getLabel():string;
    getIdent():number;
    getView():TileComponent;
    supportsExtendedView():boolean;
    isHidden():boolean;

    /**
     *  0: no support
     *  1..n: support with defined priority (use some high number for top priority
     *  (e.g. use css z-index analogy))
     */
    getQueryTypeSupport(qt:QueryType, lang1:string, lang2?:string):number;

    disable():void;
}


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
        conf:T;
    }

    export interface TileFactory<T> {
        (args:Args<T>):ITileProvider;
    }
}


export interface TileFrameProps {
    tileId:number;
    Component:TileComponent;
    label:string;
    supportsExtendedView:boolean;
    queryTypeSupport:number;
    renderSize:[number, number];
    isHidden:boolean;
}

export interface DataApi<T, U> {
    call(queryArgs:T):Rx.Observable<U>;
}