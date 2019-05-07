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
import * as Immutable from 'immutable';
import { IActionDispatcher, StatelessModel } from 'kombo';

import { AppServices } from '../../appServices';
import { DataRow, FreqDistribAPI, FreqSort } from '../../common/api/kontext/freqs';
import { QueryType } from '../../common/query';
import { ITileProvider, TileComponent, TileConf, TileFactory } from '../../common/tile';
import { GeoAreasModel } from './model';
import { init as viewInit } from './views';


declare var require:any;
require('./style.less');


export interface GeoAreasTileConf extends TileConf {
    apiURL:string;
    corpname:string;
    fcrit:string;
    flimit:number;
    freqSort:FreqSort;
    fpage:number;
    fttIncludeEmpty:boolean;
    areaCodeMapping:{[name:string]:string};
    areaDiscFillColor:string;
    areaDiscTextColor:string;
    tileType:'GeoAreasTile';
}


export class GeoAreasTile implements ITileProvider {

    private readonly tileId:number;

    private label:string;

    private readonly dispatcher:IActionDispatcher;

    private readonly appServices:AppServices;

    private readonly model:GeoAreasModel;

    private readonly view:TileComponent;

    private readonly widthFract:number;

    private readonly blockingTiles:Array<number>;

    constructor({tileId, dispatcher, appServices, ut, theme, waitForTiles, widthFract, conf, isBusy}:TileFactory.Args<GeoAreasTileConf>) {
        this.tileId = tileId;
        this.label = appServices.importExternalMessage(conf.label);
        this.dispatcher = dispatcher;
        this.appServices = appServices;
        this.widthFract = widthFract;
        this.blockingTiles = waitForTiles;
        this.model = new GeoAreasModel(
            dispatcher,
            tileId,
            waitForTiles[0],
            appServices,
            new FreqDistribAPI(conf.apiURL, appServices.getApiHeaders(conf.apiURL)),
            {
                isBusy: isBusy,
                error: null,
                areaCodeMapping: Immutable.Map<string, string>(conf.areaCodeMapping),
                mapSVG: '',
                highlightedTableRow: -1,
                data: Immutable.List<DataRow>(),
                corpname: conf.corpname,
                concId: null,
                fcrit: conf.fcrit,
                flimit: conf.flimit,
                freqSort: conf.freqSort,
                fpage: conf.fpage,
                fttIncludeEmpty: conf.fttIncludeEmpty,
                fmaxitems: 100,
                areaDiscFillColor: conf.areaDiscFillColor,
                areaDiscTextColor: conf.areaDiscTextColor
            }
        );
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

    getSourceInfoView():null {
        return null;
    }

    /**
     */
    supportsQueryType(qt:QueryType, lang1:string, lang2?:string):boolean {
        return qt === QueryType.SINGLE_QUERY;
    }

    disable():void {
        this.model.suspend(()=>false);
    }

    getWidthFract():number {
        return this.widthFract;
    }

    supportsTweakMode():boolean {
        return false;
    }

    supportsAltView():boolean {
        return false;
    }

    exposeModelForRetryOnError():StatelessModel<{}>|null {
        return this.model;
    }

    getBlockingTiles():Array<number> {
        return this.blockingTiles;
    }
}

export const init:TileFactory.TileFactory<GeoAreasTileConf>  = (args) => new GeoAreasTile(args);
