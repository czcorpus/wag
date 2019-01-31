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
import { ITileProvider, TileFactory, QueryType, TileComponent } from '../../abstract/types';
import { ActionDispatcher, ViewUtils } from 'kombo';
import { GlobalComponents } from '../../views/global';
import { TimeDistribModel, FreqFilterQuantity, AlignType } from './model';
import { TimeDistribAPI } from './api';
import {init as viewInit} from './view';
import { AlphaLevel } from './stat';
import { DataItemWithWCI } from './common';
import { AppServices } from '../../appServices';

declare var require:(src:string)=>void;  // webpack
require('./style.less');


export interface TimeDistTileConf {

    apiURL:string;

    corpname:string;

    /**
     * E.g. 'lemma', 'word'
     */
    distProperty:string;

    /**
     * E.g. doc.pubyear
     */
    timeProperty:string;
}


export class TimeDistTile implements ITileProvider {

    private readonly dispatcher:ActionDispatcher;

    private readonly tileId:number;

    private readonly ut:ViewUtils<GlobalComponents>;

    private readonly model:TimeDistribModel;

    // a (time based) structural attribute property we are looking for in this tile
    private readonly distProperty:string;

    private view:TileComponent;

    constructor(dispatcher:ActionDispatcher, tileId:number, waitForTile:number, ut:ViewUtils<GlobalComponents>,
                appServices:AppServices, conf:TimeDistTileConf) {
        this.dispatcher = dispatcher;
        this.tileId = tileId;
        this.ut = ut;
        this.distProperty = conf.distProperty;
        this.model = new TimeDistribModel(
            dispatcher,
            {
                isBusy: false,
                error: null,
                corpname: conf.corpname,
                q: null,
                attrTime: conf.timeProperty,
                attrValue: conf.distProperty,
                minFreq: '10', // TODO (conf)
                minFreqType: FreqFilterQuantity.IPM,
                alignType1: AlignType.LEFT,
                ctxIndex1: 6, // TODO conf/explain
                alignType2: AlignType.LEFT,
                ctxIndex2: 6, // TODO conf/explain
                alphaLevel: AlphaLevel.LEVEL_0_1, // TODO conf/explain
                data: Immutable.List<DataItemWithWCI>()
            },
            tileId,
            waitForTile,
            new TimeDistribAPI(conf.apiURL),
            appServices
        );
    }


    init():void {
        this.view = viewInit(this.dispatcher, this.ut, this.model);
    }

    getIdent():number {
        return this.tileId;
    }

    getView():TileComponent {
        return this.view;
    }

    supportsExtendedView():boolean {
        return false;
    }

    getLabel():string {
        return this.ut.translate('timeDistrib__main_label');
    }

    getQueryTypeSupport(qt:QueryType, lang1:string, lang2?:string):number {
        if (qt === QueryType.SINGLE_QUERY || qt === QueryType.TRANSLAT_QUERY) {
            return 1;
        }
        return 0;
    }

    isHidden():boolean {
        return false;
    }

}



export const init:TileFactory.TileFactory<TimeDistTileConf>  = ({tileId, waitForTile, dispatcher, ut, appServices, conf}) => {
    return new TimeDistTile(dispatcher, tileId, waitForTile, ut, appServices, conf);
}