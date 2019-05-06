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
import { ActionDispatcher, StatelessModel } from 'kombo';

import { AppServices } from '../../appServices';
import { BacklinkArgs } from '../../common/api/kontext/freqs';
import { CorePosAttribute } from '../../common/types';
import { QueryType } from '../../common/query';
import { CollocMetric, DataRow, SrchContextType } from './common';
import { CollocModel } from './model';
import { KontextCollAPI } from './service';
import { init as viewInit } from './views';
import { TileConf, BacklinkWithArgs, ITileProvider, TileComponent, TileFactory } from '../../common/tile';


declare var require:(src:string)=>void;  // webpack
require('./style.less');


export interface CollocationsTileConf extends TileConf {
    tileType:'CollocTile';
    apiURL:string;
    corpname:string;
    minFreq:number;
    minLocalFreq:number;
    rangeSize:number;
    backlink:BacklinkWithArgs<BacklinkArgs>;
}

/**
 *
 */
export class CollocationsTile implements ITileProvider {

    private readonly tileId:number;

    private readonly dispatcher:ActionDispatcher;

    private readonly appServices:AppServices;

    private readonly model:CollocModel;

    private readonly widthFract:number;

    private readonly label:string;

    private readonly blockingTiles:Array<number>;

    private view:TileComponent;

    constructor({tileId, dispatcher, appServices, ut, theme, waitForTiles, widthFract, conf}:TileFactory.Args<CollocationsTileConf>) {
        this.tileId = tileId;
        this.dispatcher = dispatcher;
        this.appServices = appServices;
        this.widthFract = widthFract;
        this.blockingTiles = waitForTiles;
        this.model = new CollocModel({
            dispatcher: dispatcher,
            tileId: tileId,
            waitForTile: waitForTiles[0],
            appServices: appServices,
            service: new KontextCollAPI(conf.apiURL, appServices.getApiHeaders(conf.apiURL)),
            backlink: conf.backlink || null,
            initState: {
                isBusy: false,
                isTweakMode: false,
                isAltViewMode: false,
                tileId: tileId,
                widthFract: widthFract,
                error: null,
                corpname: conf.corpname,
                concId: null,
                cattr: CorePosAttribute.LEMMA,
                ctxSize: conf.rangeSize,
                ctxType: SrchContextType.BOTH,
                cminfreq: conf.minFreq,
                cminbgr: conf.minLocalFreq,
                cbgrfns: [CollocMetric.LOG_DICE, CollocMetric.MI, CollocMetric.T_SCORE],
                csortfn: CollocMetric.LOG_DICE,
                data: Immutable.List<DataRow>(),
                heading: [],
                citemsperpage: 10,
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

    getSourceInfoView():null {
        return null;
    }

    supportsQueryType(qt:QueryType, lang1:string, lang2?:string):boolean {
        return qt === QueryType.SINGLE_QUERY || qt === QueryType.TRANSLAT_QUERY;
    }

    disable():void {
        this.model.suspend(()=>false);
    }

    getWidthFract():number {
        return this.widthFract;
    }

    supportsTweakMode():boolean {
        return true;
    }

    supportsHelpView():boolean {
        return true;
    }

    supportsAltView():boolean {
        return true;
    }

    exposeModelForRetryOnError():StatelessModel<{}>|null {
        return this.model;
    }

    getBlockingTiles():Array<number> {
        return this.blockingTiles;
    }
}


export const init:TileFactory.TileFactory<CollocationsTileConf> = (args) => new CollocationsTile(args);