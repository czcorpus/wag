/*
 * Copyright 2019 Tomas Machalek <tomas.machalek@gmail.com>
 * Copyright 2019 Institute of the Czech National Corpus,
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
import { IActionDispatcher, StatelessModel } from 'kombo';

import { IAppServices } from '../../../appServices';
import { FreqSort } from '../../../api/vendor/kontext/freqs';
import { QueryType } from '../../../query/index';
import { ITileProvider, TileComponent, TileConf, TileFactory } from '../../../page/tile';
import { GeoAreasModel } from './model';
import { init as viewInit } from './views';
import { MapLoader } from './mapLoader';
import { createApiInstance } from '../../../api/factory/freqs';


declare var require:any;
require('./style.less');


export interface GeoAreasTileConf extends TileConf {
    apiURL:string;
    apiType:string;
    corpname:string;
    fcrit:string;
    flimit:number;
    freqSort:FreqSort;
    fpage:number;
    fttIncludeEmpty:boolean;
    areaCodeMapping:{[name:string]:string};
    frequencyDisplayLimit:number;
}


export class GeoAreasTile implements ITileProvider {

    private readonly tileId:number;

    private label:string;

    private readonly dispatcher:IActionDispatcher;

    private readonly appServices:IAppServices;

    private readonly model:GeoAreasModel;

    private readonly view:TileComponent;

    private readonly widthFract:number;

    private readonly blockingTiles:Array<number>;

    constructor({tileId, dispatcher, appServices, ut, theme, waitForTiles, waitForTilesTimeoutSecs, widthFract, conf,
            isBusy, cache}:TileFactory.Args<GeoAreasTileConf>) {
        this.tileId = tileId;
        this.label = appServices.importExternalMessage(conf.label);
        this.dispatcher = dispatcher;
        this.appServices = appServices;
        this.widthFract = widthFract;
        this.blockingTiles = waitForTiles;
        this.model = new GeoAreasModel({
            dispatcher,
            tileId,
            waitForTile: waitForTiles.length > 0 ? waitForTiles[0] : -1,
            waitForTilesTimeoutSecs,
            appServices,
            api: createApiInstance(cache, conf.apiType, conf.apiURL, appServices),
            mapLoader: new MapLoader(cache, appServices),
            initState: {
                isBusy: isBusy,
                error: null,
                areaCodeMapping: {...conf.areaCodeMapping},
                mapSVG: '',
                tooltipArea: null,
                data: [],
                corpname: conf.corpname,
                concId: null,
                fcrit: conf.fcrit,
                flimit: conf.flimit,
                freqSort: conf.freqSort,
                fpage: conf.fpage,
                fttIncludeEmpty: conf.fttIncludeEmpty,
                fmaxitems: 100,
                isAltViewMode: false,
                frequencyDisplayLimit: conf.frequencyDisplayLimit
            }
        });
        this.label = appServices.importExternalMessage(conf.label || 'geolocations__main_label');
        this.view = viewInit(this.dispatcher, ut, theme, this.model);
    }

    getLabel():string {
        return this.label;
    }

    getIdent():number {
        return this.tileId;
    }

    getView():TileComponent {
        return this.view;
    }

    getSourceInfoComponent():null {
        return null;
    }

    /**
     */
    supportsQueryType(qt:QueryType, domain1:string, domain2?:string):boolean {
        return qt === QueryType.SINGLE_QUERY;
    }

    disable():void {
        this.model.suspend({}, (_, syncData)=>syncData);
    }

    getWidthFract():number {
        return this.widthFract;
    }

    supportsTweakMode():boolean {
        return false;
    }

    supportsAltView():boolean {
        return true;
    }

    exposeModel():StatelessModel<{}>|null {
        return this.model;
    }

    getBlockingTiles():Array<number> {
        return this.blockingTiles;
    }

    supportsMultiWordQueries():boolean {
        return true;
    }

    getIssueReportingUrl():null {
        return null;
    }
}

export const init:TileFactory.TileFactory<GeoAreasTileConf>  = (args) => new GeoAreasTile(args);
