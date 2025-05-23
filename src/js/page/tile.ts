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

import { LocalizedConfMsg } from '../types.js';
import { QueryType, RecognizedQueries } from '../query/index.js';
import { ViewUtils, StatelessModel, StatefulModel, IFullActionControl } from 'kombo';
import { GlobalComponents } from '../views/common/index.js';
import { Theme } from './theme.js';
import { IAppServices } from '../appServices.js';
import { MainPosAttrValues } from '../conf/index.js';
import { List } from 'cnc-tskit';


export interface BacklinkConf<T = undefined> {
    url:string;
    label?:LocalizedConfMsg;
    args?:T;
}

export interface Backlink {
    queryId:number;
    subqueryId?:number;
    label:LocalizedConfMsg;
}

export function backlinkIsValid(backlink:Backlink|null|Array<Backlink|null>):boolean {
    if (Array.isArray(backlink)) {
        return List.some(x => !!x, backlink);
    }
    return !Array.isArray(backlink) && !!backlink;
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
    backlink?:BacklinkConf<any>;

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
    supportsQueryType(qt:QueryType, translatLang?:string):boolean;

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

    supportsMultiWordQueries():boolean;

    getIssueReportingUrl():string|null;

    getAltViewIcon():AltViewIconProps;

    /**
     * A tile may share a data source with
     * other tile. In such case, a "dependent"
     * tile must declare its dependence
     * on the "primary" tile.
     */
    getReadDataFrom():number|null;
}

/**
 * Each tile module must provide this factory
 * to allow wdglance create proper instance
 * of a respective tile.
 */
export interface TileFactoryArgs<T> {

    tileId:number;

    dispatcher:IFullActionControl;

    ut:ViewUtils<GlobalComponents>;

    theme:Theme,

    appServices:IAppServices;

    queryMatches:RecognizedQueries;

    queryType:QueryType;

    /**
     * If specified, then the tile will not need
     * its own data request but it will be served
     * using data from a different tile
     * (e.g. the conc tile from the coll tile)
     */
    readDataFromTile?:number;

    widthFract:number;

    isBusy:boolean;

    conf:T;

    mainPosAttr:MainPosAttrValues;

    useDataStream:boolean;

    dependentTiles:Array<number>;
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
    registerModel(tile:ITileProvider, model:StatelessModel<{}>|StatefulModel<{}>):void;
}