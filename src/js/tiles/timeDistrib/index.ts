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
import { ITileProvider, TileFactory, QueryType, TileComponent, TileConf, CorpSrchTileConf } from '../../common/types';
import { ActionDispatcher, ViewUtils } from 'kombo';
import { GlobalComponents } from '../../views/global';
import { TimeDistribModel, FreqFilterQuantity, AlignType } from './model';
import { TimeDistribAPI } from './api';
import {init as viewInit} from './view';
import { AlphaLevel } from './stat';
import { DataItemWithWCI } from './common';
import { AppServices } from '../../appServices';
import { Theme } from '../../common/theme';

declare var require:(src:string)=>void;  // webpack
require('./style.less');


export interface TimeDistTileConf extends CorpSrchTileConf {

    tileType:'TimeDistribTile';

    apiURL:string;

    /**
     * E.g. 'lemma', 'word'
     */
    distProperty:string;

    /**
     * E.g. doc.pubyear
     */
    timeProperty:string;

    minFreq:number;
}


export class TimeDistTile implements ITileProvider {

    private readonly dispatcher:ActionDispatcher;

    private readonly tileId:number;

    private readonly model:TimeDistribModel;

    private readonly widthFract:number;

    private readonly appServices:AppServices;

    private view:TileComponent;

    constructor({dispatcher, tileId, waitForTiles, ut, theme, appServices, widthFract, conf}:TileFactory.Args<TimeDistTileConf>) {
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
                subcname: conf.subcname,
                subcDesc: appServices.importExternalMessage(conf.subcDesc),
                concId: null,
                attrTime: conf.timeProperty,
                attrValue: conf.distProperty,
                minFreq: conf.minFreq,
                minFreqType: FreqFilterQuantity.IPM,
                alignType1: AlignType.LEFT,
                ctxIndex1: 6, // TODO conf/explain
                alignType2: AlignType.LEFT,
                ctxIndex2: 6, // TODO conf/explain
                alphaLevel: AlphaLevel.LEVEL_0_1, // TODO conf/explain
                data: Immutable.List<DataItemWithWCI>()
            },
            tileId,
            waitForTiles[0],
            new TimeDistribAPI(conf.apiURL),
            appServices
        );
        this.view = viewInit(this.dispatcher, ut, theme, this.model);
    }

    getIdent():number {
        return this.tileId;
    }

    getView():TileComponent {
        return this.view;
    }

    getLabel():string {
        return this.appServices.translate('timeDistrib__main_label');
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