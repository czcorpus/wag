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

import { AppServices } from '../../../appServices';
import { CorePosAttribute } from '../../../common/types';
import { QueryType } from '../../../common/query';
import { CollocMetric } from './common';
import { CollocModel } from './model';
import { init as viewInit } from './views';
import { TileConf, ITileProvider, TileComponent, TileFactory, Backlink } from '../../../common/tile';
import { CollocationApi, SrchContextType } from '../../../common/api/abstract/collocations';
import { createInstance } from './apiFactory';


declare var require:(src:string)=>void;  // webpack
require('./style.less');


export interface CollocationsTileConf extends TileConf {
    apiURL:string;
    apiType:string;
    corpname:string;
    minFreq:number;
    minLocalFreq:number;
    rangeSize:number;
    maxItems?:number;
    backlink?:Backlink;
}

/**
 *
 */
export class CollocationsTile implements ITileProvider {

    private readonly tileId:number;

    private readonly dispatcher:IActionDispatcher;

    private readonly appServices:AppServices;

    private readonly model:CollocModel;

    private readonly widthFract:number;

    private readonly label:string;

    private readonly blockingTiles:Array<number>;

    private view:TileComponent;

    private readonly api:CollocationApi<{}>;

    constructor({tileId, dispatcher, appServices, ut, theme, waitForTiles, widthFract, conf, isBusy, lemmas, cache, queryType}:TileFactory.Args<CollocationsTileConf>) {
        this.tileId = tileId;
        this.dispatcher = dispatcher;
        this.appServices = appServices;
        this.widthFract = widthFract;
        this.blockingTiles = waitForTiles;
        this.api = createInstance(conf.apiType, conf.apiURL, appServices.getApiHeaders(conf.apiURL), cache);
        this.model = new CollocModel({
            dispatcher: dispatcher,
            tileId: tileId,
            waitForTile: waitForTiles[0],
            appServices: appServices,
            service: this.api,
            backlink: conf.backlink || null,
            lemmas: lemmas,
            queryType: queryType,
            initState: {
                isBusy: isBusy,
                isTweakMode: false,
                isAltViewMode: false,
                tileId: tileId,
                widthFract: widthFract,
                error: null,
                corpname: conf.corpname,
                concId: null,
                tokenAttr: CorePosAttribute.LEMMA,
                srchRange: conf.rangeSize,
                srchRangeType: SrchContextType.BOTH,
                minAbsFreq: conf.minFreq,
                minLocalAbsFreq: conf.minLocalFreq,
                appliedMetrics: [CollocMetric.LOG_DICE, CollocMetric.MI, CollocMetric.T_SCORE],
                sortByMetric: CollocMetric.LOG_DICE,
                data: [],
                heading: [],
                citemsperpage: conf.maxItems ? conf.maxItems : 10,
                backlink: null
            }
        });
        this.label = appServices.importExternalMessage(conf.label || 'collocations__main_label');
        this.view = viewInit(
            this.dispatcher,
            ut,
            theme,
            this.model
        );
    }

    getIdent():number {
        return this.tileId;
    }

    getLabel():string {
        return this.label;
    }

    getView():TileComponent {
        return this.view;
    }

    getSourceInfoComponent():null {
        return null;
    }

    supportsQueryType(qt:QueryType, lang1:string, lang2?:string):boolean {
        return qt === QueryType.SINGLE_QUERY || qt === QueryType.CMP_QUERY || qt === QueryType.TRANSLAT_QUERY;
    }

    disable():void {
        this.model.suspend(()=>false);
    }

    getWidthFract():number {
        return this.widthFract;
    }

    supportsTweakMode():boolean {
        return this.api.supportsLeftRightContext();
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

    supportsNonDictQueries():boolean {
        return false;
    }

    getIssueReportingUrl():null {
        return null;
    }
}

export const TILE_TYPE = 'CollocTile';

export const init:TileFactory.TileFactory<CollocationsTileConf> = (args) => new CollocationsTile(args);