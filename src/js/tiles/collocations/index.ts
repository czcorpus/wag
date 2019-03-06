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
import { TileFactory, ITileProvider, CorePosAttribute, QueryType, TileComponent, TileConf, BacklinkWithArgs } from '../../common/types';
import { AppServices } from '../../appServices';
import { CollocModel } from './model';
import { KontextCollAPI } from './service';
import {init as viewInit} from './views';
import { ActionDispatcher } from 'kombo';
import { CollocMetric, DataRow, SrchContextType } from './common';
import { BacklinkArgs } from '../../common/api/kontextFreqs';

declare var require:(src:string)=>void;  // webpack
require('./style.less');


export interface CollocationsTileConf extends TileConf {
    tileType:'CollocTile';
    apiURL:string;
    corpname:string;
    backlink:BacklinkWithArgs<BacklinkArgs>;
}

export function isCollocationsTileConf(conf:TileConf):conf is CollocationsTileConf {
    return conf.tileType == 'CollocTile';
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

    private view:TileComponent;

    constructor({tileId, dispatcher, appServices, ut, theme, waitForTiles, widthFract, conf}:TileFactory.Args<CollocationsTileConf>) {
        this.tileId = tileId;
        this.dispatcher = dispatcher;
        this.appServices = appServices;
        this.widthFract = widthFract;
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
                tileId: tileId,
                widthFract: widthFract,
                error: null,
                corpname: conf.corpname,
                concId: null,
                cattr: CorePosAttribute.LEMMA,
                ctxSize: 2,
                ctxType: SrchContextType.BOTH,
                cminfreq: 1,
                cminbgr: 3,
                cbgrfns: [CollocMetric.LOG_DICE, CollocMetric.MI, CollocMetric.T_SCORE],
                csortfn: CollocMetric.LOG_DICE,
                data: Immutable.List<DataRow>(),
                heading: [],
                citemsperpage: 10,
                backlink: null
            }
        });

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
        return this.appServices.translate('collocations__main_label');
    }

    getView():TileComponent {
        return this.view;
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
}


export const init:TileFactory.TileFactory<CollocationsTileConf> = (args) => new CollocationsTile(args);