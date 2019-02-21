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
import { ITileProvider, QueryType, TileConf, TileFactory, TileComponent } from '../../common/types';
import { ActionDispatcher } from 'kombo';
import { AppServices } from '../../appServices';
import {init as viewInit} from './views';
import { GeoAreasModel } from './model';
import { DataRow, FreqDistribAPI } from '../../common/api/kontextFreqs';
declare var require:any;
require('./style.less');


export interface GeoAreasTileConf extends TileConf {
    apiURL:string;
    corpname:string;
    fcrit:string;
    flimit:number;
    freqSort:string;
    fpage:number;
    fttIncludeEmpty:boolean;
    areaCodeMapping:{[name:string]:string};
    tileType:'GeoAreasTile';
}


export class GeoAreasTile implements ITileProvider {

    private readonly tileId:number;

    private label:string;

    private readonly dispatcher:ActionDispatcher;

    private readonly appServices:AppServices;

    private readonly model:GeoAreasModel;

    private readonly view:TileComponent;

    private readonly widthFract:number;

    constructor({tileId, dispatcher, appServices, ut, theme, waitForTiles, widthFract, conf}:TileFactory.Args<GeoAreasTileConf>) {
        this.tileId = tileId;
        this.label = appServices.importExternalMessage(conf.label);
        this.dispatcher = dispatcher;
        this.appServices = appServices;
        this.widthFract = widthFract;
        this.model = new GeoAreasModel(
            dispatcher,
            tileId,
            waitForTiles[0],
            appServices,
            new FreqDistribAPI(conf.apiURL),
            {
                isBusy: false,
                error: null,
                areaCodeMapping: Immutable.Map<string, string>(conf.areaCodeMapping),
                highlightedTableRow: -1,
                data: Immutable.List<DataRow>(),
                corpname: conf.corpname,
                concId: null,
                fcrit: conf.fcrit,
                flimit: conf.flimit,
                freqSort: conf.freqSort,
                fpage: conf.fpage,
                fttIncludeEmpty: conf.fttIncludeEmpty
            }
        );
        this.view = viewInit(this.dispatcher, ut, theme, this.model);
    }

    getLabel():string {
        return this.label ? this.label : this.appServices.translate('geolocations__main_label');
    }

    getIdent():number {
        return this.tileId;
    }

    getView():TileComponent {
        return this.view;
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

    supportsHelpView():boolean {
        return true;
    }
}

export const init:TileFactory.TileFactory<GeoAreasTileConf>  = (args) => new GeoAreasTile(args);
