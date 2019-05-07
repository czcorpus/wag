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

import { HTTPMethod, AnyInterface, LocalizedConfMsg } from './types';
import { QueryType } from './query';
import { IActionDispatcher, ViewUtils, StatelessModel } from 'kombo';
import { GlobalComponents } from '../views/global';
import { Theme } from './theme';
import { AppServices } from '../appServices';
import { WdglanceMainFormModel } from '../models/query';


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

    SourceInfoComponent:SourceInfoComponent;

    label:string;

    supportsTweakMode:boolean;

    supportsCurrQueryType:boolean;

    supportsHelpView:boolean;

    supportsAltView:boolean;

    helpURL:string;

    renderSize:[number, number];

    /**
     * standard mode width in CSS grid fr units
     */
    widthFract:number;

    supportsReloadOnError:boolean;
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
    supportsReloadOnError:boolean;
}

/**
 * A general tile component.
 */
export type TileComponent = React.ComponentClass<CoreTileComponentProps>|React.SFC<CoreTileComponentProps>;

export type SourceInfoComponent = React.ComponentClass<{data:{}}>|React.SFC<{}>

/**
 * ITileProvider specifes an object which encapsulates an implementation
 * of a tile as required by wdglance initialization process. Based on
 * values returned by these methods, wdglance will prepare all the properties
 * for React components and states for models.
 */
export interface ITileProvider {

    /**
     * Return localized tile label.
     */
    getLabel():string;

    /**
     * Return numeric identifier (automatically
     * generated from string identifiers defined in
     * the configuration and passed to the tile via
     * factory method args).
     */
    getIdent():number;

    /**
     * Get tile view (there must be always a single root view)
     */
    getView():TileComponent;

    getSourceInfoView():SourceInfoComponent|null;

    /**
     */
    supportsQueryType(qt:QueryType, lang1:string, lang2?:string):boolean;

    // TODO ??
    disable():void;

    /**
     * Get defined width in number of horizontal
     * cells. This is determined by the configuration
     * and applies even if the tiles are in mobile
     * mode (i.e. in mobile mode where all the tiles are
     * 1 cell wide you can still get num > 1).
     */
    getWidthFract():number;

    supportsTweakMode():boolean;

    supportsAltView():boolean;

    /**
     * If returned then the model will be available for
     * possible manual tile reload in case of an error.
     */
    exposeModelForRetryOnError():StatelessModel<{}>|null;

    /**
     * Return a list of tiles this tile depends on
     */
    getBlockingTiles():Array<number>;
}

/**
 * Each tile module must provide this factory
 * to allow wdglance create proper instance
 * of a respective tile.
 */
export namespace TileFactory {

    export interface Args<T> {
        tileId:number;
        dispatcher:IActionDispatcher;
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