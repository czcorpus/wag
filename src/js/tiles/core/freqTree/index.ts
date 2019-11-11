/*
 * Copyright 2019 Martin Zimandl <martin.zimandl@gmail.com>
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
import { IActionDispatcher, ViewUtils, StatelessModel } from 'kombo';

import { AppServices } from '../../../appServices';
import { FreqTreeAPI } from '../../../common/api/kontext/freqTree';
import { FreqTreeDataBlock } from '../../../common/models/freqTree';
import { LocalizedConfMsg } from '../../../common/types';
import { QueryType } from '../../../common/query';
import { TileComponent, TileConf, TileFactory, Backlink, ITileProvider } from '../../../common/tile';
import { puid } from '../../../common/util';
import { GlobalComponents } from '../../../views/global';
import { factory as defaultModelFactory, FreqTreeModel } from './model';
import { init as viewInit } from './view';



declare var require:(src:string)=>void;  // webpack
require('./style.less');

export interface FreqTreeTileConf extends TileConf {
    apiURL:string;
    corpname:string;
    fcritTrees:Array<Array<string>>; // trees of 2 levels
    treeLabels:LocalizedConfMsg|Array<LocalizedConfMsg>;
    flimit:number;
    fpage:number;
    fttIncludeEmpty:boolean;
    maxChartsPerLine?:number;
    colors?:Array<string>;
    backlink?:Backlink;
}


export class FreqTreeTile implements ITileProvider {

    private readonly dispatcher:IActionDispatcher;

    private readonly ut:ViewUtils<GlobalComponents>;

    private readonly model:FreqTreeModel;

    private readonly tileId:number;

    private view:TileComponent;

    private readonly label:string;

    private readonly widthFract:number;

    private readonly appServices:AppServices;

    private readonly blockingTiles:Array<number>;

    constructor({dispatcher, tileId, waitForTiles, ut, theme, appServices, widthFract, conf, isBusy, cache, lemmas}:TileFactory.Args<FreqTreeTileConf>) {
        this.dispatcher = dispatcher;
        this.tileId = tileId;
        this.widthFract = widthFract;
        this.appServices = appServices;
        this.blockingTiles = waitForTiles;
        this.label = appServices.importExternalMessage(conf.label);
        const criteria = Immutable.fromJS(conf.fcritTrees);
        const labels = Immutable.fromJS(Array.isArray(conf.treeLabels) ?
            conf.treeLabels.map(v => this.appServices.importExternalMessage(v)) :
            [this.appServices.importExternalMessage(conf.treeLabels)]);

        this.model = defaultModelFactory(
            this.dispatcher,
            tileId,
            waitForTiles,
            appServices,
            new FreqTreeAPI(cache, conf.apiURL, appServices.getApiHeaders(conf.apiURL)),
            conf.backlink || null,
            {
                isBusy: isBusy,
                error: null,
                frequencyTree: Immutable.List(criteria.map(_ => ({
                    data: Immutable.Map(),
                    ident: puid(),
                    label: '',
                    isReady: false
                }) as FreqTreeDataBlock)),
                activeBlock: 0,
                corpname: conf.corpname,
                fcritTrees: criteria,
                treeLabels: labels,
                flimit: conf.flimit,
                fpage: conf.fpage,
                fttIncludeEmpty: conf.fttIncludeEmpty,
                fmaxitems: 100,
                backlink: null,
                maxChartsPerLine: conf.maxChartsPerLine ? conf.maxChartsPerLine : 3,
                colors: conf.colors ? conf.colors : ["#8addff", "#f26e43"],
                lemmas: lemmas,
                zoomCategory: criteria.map(_ => Immutable.List(lemmas.map(_ => null))).toList()
            }
        );
        this.label = appServices.importExternalMessage(conf.label || 'freqTree__main_label');
        this.view = viewInit(this.dispatcher, ut, theme, this.model);
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

    getLabel():string {
        return this.label;
    }

    supportsQueryType(qt:QueryType, lang1:string, lang2?:string):boolean {
        return qt === QueryType.CMP_QUERY;
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

    supportsNonDictQueries():boolean {
        return true;
    }

    exposeModel():StatelessModel<{}>|null {
        return this.model;
    }

}

export const TILE_TYPE = 'FreqTreeTile';

export const init:TileFactory.TileFactory<FreqTreeTileConf>  = (args) => new FreqTreeTile(args);