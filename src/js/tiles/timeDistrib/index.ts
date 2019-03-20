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
import { ActionDispatcher } from 'kombo';

import { AppServices } from '../../appServices';
import { ConcApi } from '../../common/api/kontext/concordance';
import { FreqDistribAPI } from '../../common/api/kontext/freqs';
import { CorpSrchTileConf, ITileProvider, QueryType, TileComponent, TileFactory } from '../../common/types';
import { DataItemWithWCI } from './common';
import { TimeDistribModel } from './model';
import { AlphaLevel } from './stat';
import { init as viewInit } from './view';

declare var require:(src:string)=>void;  // webpack
require('./style.less');


export interface TimeDistTileConf extends CorpSrchTileConf {

    tileType:'TimeDistribTile';

    apiURL:string;

    concApiURL?:string;

    /**
     * E.g. doc.pubyear
     */
    fcrit:string;

    timeAxisLegend:string;

    flimit:number;

    posQueryGenerator:[string, string];
}

/**
 * Important note: the tile works in two mutually exclusive
 * modes:
 * 1) depending on a concordance tile
 *   - in such case the concordance (subc)corpus must be
 *     the same as the (sub)corpus this tile works with
 *   - the 'dependsOn' conf value must be set
 *   - the 'subcname' should have only one value (others are ignored)
 *
 * 2) independent - creating its own concordances, using possibly multiple subcorpora
 *   - the 'dependsOn' cannot be present in the confir
 *   - the 'subcname' can have any number of items
 *     - the tile queries all the subcorpora and then merges all the data
 *
 */
export class TimeDistTile implements ITileProvider {

    private readonly dispatcher:ActionDispatcher;

    private readonly tileId:number;

    private readonly model:TimeDistribModel;

    private readonly widthFract:number;

    private readonly appServices:AppServices;

    private readonly view:TileComponent;

    private readonly label:string;

    constructor({dispatcher, tileId, waitForTiles, ut, theme, appServices, widthFract, mainForm, conf}:TileFactory.Args<TimeDistTileConf>) {
        this.dispatcher = dispatcher;
        this.tileId = tileId;
        this.widthFract = widthFract;
        this.appServices = appServices;
        this.model = new TimeDistribModel(
            dispatcher,
            {
                isBusy: false,
                error: null,
                corpname: conf.corpname,
                subcnames: Immutable.List<string>(Array.isArray(conf.subcname) ? conf.subcname : [conf.subcname]),
                subcDesc: appServices.importExternalMessage(conf.subcDesc),
                concId: null,
                fcrit: conf.fcrit,
                timeAxisLegend: conf.timeAxisLegend,
                flimit: conf.flimit,
                freqSort: "rel",
                fpage: 1,
                fttIncludeEmpty: false,
                fmaxitems: 100,
                alphaLevel: AlphaLevel.LEVEL_0_1, // TODO conf/explain
                data: Immutable.List<DataItemWithWCI>(),
                posQueryGenerator: conf.posQueryGenerator
            },
            tileId,
            waitForTiles[0] || -1,
            new FreqDistribAPI(conf.apiURL, appServices.getApiHeaders(conf.apiURL)),
            conf.concApiURL ? new ConcApi(conf.concApiURL, appServices.getApiHeaders(conf.apiURL)) : null,
            appServices,
            mainForm
        );
        this.label = appServices.importExternalMessage(conf.label || 'timeDistrib__main_label');
        this.view = viewInit(this.dispatcher, ut, theme, this.model);
    }

    getIdent():number {
        return this.tileId;
    }

    getView():TileComponent {
        return this.view;
    }

    getLabel():string {
        return this.label;
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
        return false;
    }

    supportsHelpView():boolean {
        return true;
    }
}


export const init:TileFactory.TileFactory<TimeDistTileConf>  = (args) => new TimeDistTile(args);