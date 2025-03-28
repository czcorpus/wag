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

import { AnyInterface, LocalizedConfMsg } from '../types.js';
import { QueryType, RecognizedQueries } from '../query/index.js';
import { IActionDispatcher, ViewUtils, StatelessModel } from 'kombo';
import { GlobalComponents } from '../views/common/index.js';
import { Theme } from './theme.js';
import { IAppServices } from '../appServices.js';
import { HTTP, List } from 'cnc-tskit';
import { MainPosAttrValues } from '../conf/index.js';
import { DataStreaming } from './streaming.js';


export interface Backlink {
    url?:string;
    label?:LocalizedConfMsg;
    method?:HTTP.Method;
    subcname?:string; // in case a special subc. is needed for backlink
    isAppUrl?:boolean; // sets backlink as simple link
}

export interface BacklinkWithArgs<T> {
    url:string;
    label:LocalizedConfMsg;
    method:HTTP.Method;
    args:AnyInterface<T>;
}

export type AnyBacklink<T> = BacklinkWithArgs<T>|Array<BacklinkWithArgs<T>>;

function isBacklinkWithArgs<T>(bl:AnyBacklink<T>|undefined|null): bl is BacklinkWithArgs<T> {
    return bl !== null && !Array.isArray(bl) && typeof bl == 'object' && typeof bl['url'] === 'string';
}

export function backlinkIsValid<T>(backlink:AnyBacklink<T>):boolean {
    if (Array.isArray(backlink)) {
        return List.some(x => !!x, backlink);
    }
    return !Array.isArray(backlink) && isBacklinkWithArgs(backlink) && !!backlink.url;
}

export function createAppBacklink(backlink:Backlink):BacklinkWithArgs<{}> {
    return backlink ? {
        url: backlink.url || '--UNDEFINED BACKLINK--',
        label: backlink.label || '--UNDEFINED LABEL--',
        method: backlink.method || HTTP.Method.GET,
        args: {}
    } : null
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
    helpURL?:LocalizedConfMsg;

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

    waitForTimeoutSecs?:number;

    /**
     * A label used in the header of the tile
     */
    label?:LocalizedConfMsg;

    /**
     * If needed, a specific address for a resource information can be defined.
     * (e.g. you still want to use KonText as a corpus information provider
     * for a non-KonText service).
     */
    srcInfoURL?:string;

    /**
     * Defines tile max height using a css value (e.g. '10em', '130px').
     * If other tiles in the row enforce more height, the value is ignored
     * (but a possible scrollbar is still applied if needed).
     */
    maxTileHeight?:string;

    /**
     * Defines tiles which can be used as sources of subqueries
     */
    compatibleSubqProviders?:Array<string>;

    useDataStream?:boolean;
}

/**
 * An extended version of the basic tile configuration
 * directly accessing a single (sub)corpus (typically via KonText API).
 */
export interface CorpSrchTileConf extends TileConf {

    corpname:string;

    subcname?:string|Array<string>;

    subcDesc?:LocalizedConfMsg;
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

    tileName:string; // a name used in the config to identify the instance

    Component:TileComponent;

    SourceInfoComponent:SourceInfoComponent;

    label:string;

    supportsTweakMode:boolean;

    supportsCurrQuery:boolean;

    reasonTileDisabled?:string;

    supportsHelpView:boolean;

    supportsAltView:boolean;

    supportsSVGFigureSave:boolean;

    helpURL?:string;

    renderSize:[number, number];

    /**
     * standard mode width in CSS grid fr units
     */
    widthFract:number;

    supportsReloadOnError:boolean;

    maxTileHeight:string;

    issueReportingUrl:string;

    altViewIcon:AltViewIconProps;
}

/**
 * This type specifies required tile component properties
 * core components expected them to have.
 */
export interface CoreTileComponentProps {
    tileId:number;
    tileName:string;
    renderSize:[number, number];
    isMobile:boolean;
    widthFract:number;
    supportsReloadOnError:boolean;
    issueReportingUrl:string;
}

/**
 * A general tile component.
 */
export type TileComponent = React.ComponentClass<CoreTileComponentProps>|React.FC<CoreTileComponentProps>;

export type SourceInfoComponent = React.ComponentClass<{data:{}}>|React.FC<{}>;

export interface AltViewIconProps {
    baseImg:string;
    highlightedImg:string;
    inlineCss:{[k:string]:string};
}

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

    getSourceInfoComponent():SourceInfoComponent|null;

    /**
     */
    supportsQueryType(qt:QueryType, domain1:string, domain2?:string):boolean;

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

    supportsSVGFigureSave():boolean;

    /**
     * Register tile reloading model for cases when
     * a tile fails to respond to a query properly.
     *
     * In case the tile does not support (or does not
     * want to support) reloading, the method should
     * do nothing and return false. Tiles supporting
     * reloading which actually register themselves
     * must return true. Othewise, WaG won't be able
     * to recognize wich tiles to trigger.
     */
    registerReloadModel(model:ITileReloader):boolean;

    /**
     * Return a list of tiles this tile depends on
     */
    getBlockingTiles():Array<number>;

    supportsMultiWordQueries():boolean;

    getIssueReportingUrl():string|null;

    getAltViewIcon():AltViewIconProps;


}

/**
 * Each tile module must provide this factory
 * to allow wdglance create proper instance
 * of a respective tile.
 */
export interface TileFactoryArgs<T> {

    tileId:number;

    dispatcher:IActionDispatcher;

    ut:ViewUtils<GlobalComponents>;

    theme:Theme,

    appServices:IAppServices;

    queryMatches:RecognizedQueries;

    domain1?:string;

    domain2?:string;

    queryType:QueryType;

    /**
     * Tiles we need to wait for
     */
    waitForTiles?:Array<number>;

    waitForTilesTimeoutSecs:number;

    /**
     * Tiles we want data from (via sub-query).
     * This may or may not intersect with waitForTiles -
     * the application ensures that the tile waits for
     * both 'waitForTiles' and 'subqSourceTiles'.
     */
    subqSourceTiles?:Array<number>;

    widthFract:number;

    isBusy:boolean;

    conf:T;

    mainPosAttr:MainPosAttrValues;

    useDataStream:boolean;
}

/**
 * TileFactory should take care of creating a TileProvider instance (= main tile object)
 * plus it should handle runtime assertions.
 */
export interface TileFactory<T> {

    /**
     * The sanityCheck method provides runtime assertions.
     * Detected errors should not be thrown but rather returned.
     * In case an empty array is returned, WaG assumes the tile
     * is ready to run.
     */
    sanityCheck(args:TileFactoryArgs<T>):Array<Error>;

    /**
     * Create a new tile instance
     */
    create(args:TileFactoryArgs<T>):ITileProvider;
}


export const DEFAULT_ALT_VIEW_ICON:AltViewIconProps = {
    baseImg: 'alt-view.svg',
    highlightedImg: 'alt-view_s.svg',
    inlineCss: {}
};


/**
 * ITileReloader represents a model which is able
 * to register a tile model and trigger a reload action
 * in case the tile fails to load data.
 */
export interface ITileReloader {
    registerModel(tile:ITileProvider, model:StatelessModel<{}>):void;
}