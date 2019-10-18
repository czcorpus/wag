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
import * as Immutable from 'immutable';
import { IActionDispatcher, ViewUtils, StatelessModel } from 'kombo';

import { AppServices } from '../../../appServices';
import { DataRow, FreqSort } from '../../../common/api/kontext/freqComparison';
import { FreqComparisonDataBlock } from '../../../common/models/freqComparison';
import { LocalizedConfMsg } from '../../../common/types';
import { QueryType } from '../../../common/query';
import { TileComponent, TileConf, TileFactory, Backlink, ITileProvider } from '../../../common/tile';
import { puid } from '../../../common/util';
import { GlobalComponents } from '../../../views/global';
import { factory as defaultModelFactory, FreqComparisonModel } from './model';
import { init as viewInit } from './view';
import { FreqComparisonAPI } from '../../../common/api/kontext/freqComparison';



declare var require:(src:string)=>void;  // webpack
require('./style.less');

export interface FreqComparisonTileConf extends TileConf {
    apiURL:string;
    corpname:string|null; // null can be used in case subqueryMode is enabled
    fcrit:string|Array<string>;
    critLabels:LocalizedConfMsg|Array<LocalizedConfMsg>;
    flimit:number;
    freqSort:FreqSort;
    fpage:number;
    fttIncludeEmpty:boolean;
    maxNumCategories:number;
    colors?:Array<string>;
    backlink?:Backlink;
}


export class FreqComparisonTile implements ITileProvider {

    private readonly dispatcher:IActionDispatcher;

    private readonly ut:ViewUtils<GlobalComponents>;

    private readonly model:FreqComparisonModel;

    private readonly tileId:number;

    private view:TileComponent;

    private readonly label:string;

    private readonly widthFract:number;

    private readonly appServices:AppServices;

    private readonly blockingTiles:Array<number>;

    constructor({dispatcher, tileId, waitForTiles, subqSourceTiles, ut, theme, appServices, widthFract, conf, isBusy, cache, mainForm}:TileFactory.Args<FreqComparisonTileConf>) {
        this.dispatcher = dispatcher;
        this.tileId = tileId;
        this.widthFract = widthFract;
        this.appServices = appServices;
        this.blockingTiles = waitForTiles;
        this.label = appServices.importExternalMessage(conf.label);
        const criteria = Immutable.List<string>(typeof conf.fcrit === 'string' ? [conf.fcrit] : conf.fcrit);
        const labels = Array.isArray(conf.critLabels) ?
            conf.critLabels.map(v => this.appServices.importExternalMessage(v)) :
            [this.appServices.importExternalMessage(conf.critLabels)];

        this.model = defaultModelFactory(
            this.dispatcher,
            tileId,
            waitForTiles,
            subqSourceTiles,
            appServices,
            new FreqComparisonAPI(cache, conf.apiURL, appServices.getApiHeaders(conf.apiURL)),
            conf.backlink || null,
            {
                isBusy: isBusy,
                error: null,
                blocks: Immutable.List<FreqComparisonDataBlock<DataRow>>(criteria.map(v => ({
                    data: Immutable.List<DataRow>(),
                    ident: puid(),
                    isReady: false
                }))),
                activeBlock: 0,
                corpname: conf.corpname,
                concId: null,
                fcrit: criteria,
                critLabels: Immutable.List<string>(labels),
                flimit: conf.flimit,
                freqSort: conf.freqSort,
                fpage: conf.fpage,
                fttIncludeEmpty: conf.fttIncludeEmpty,
                maxNumCategories: conf.maxNumCategories,
                fmaxitems: 100,
                backlink: null,
                colors: conf.colors ? conf.colors : ["#8addff", "#f26e43"]
            },
            mainForm
        );
        this.label = appServices.importExternalMessage(conf.label || 'freqComparison__main_label');
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

export const TILE_TYPE = 'FreqComparisonTile';

export const init:TileFactory.TileFactory<FreqComparisonTileConf>  = (args) => new FreqComparisonTile(args);