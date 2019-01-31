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
import { TileFactory, ITileProvider, CorePosAttribute, QueryType, TileComponent } from "../../abstract/types";
import { AppServices } from "../../appServices";
import { CollocModel } from "./model";
import { KontextCollAPI } from "./service";
import {init as viewInit} from './views';
import { ActionDispatcher, ViewUtils } from "kombo";
import { GlobalComponents } from "../../views/global";
import { CollocMetric, DataRow } from "./common";

declare var require:(src:string)=>void;  // webpack
require('./style.less');


export interface CollocationsTileConf {
    apiURL:string;
    corpname:string;
}

/**
 *
 */
export class CollocationsTile implements ITileProvider {

    private readonly tileId:number;

    private readonly dispatcher:ActionDispatcher;

    private readonly ut:ViewUtils<GlobalComponents>;

    private readonly appServices:AppServices;

    private readonly model:CollocModel;

    private view:TileComponent;

    constructor({tileId, dispatcher, appServices, ut, waitForTile, conf}:TileFactory.Args<CollocationsTileConf>) {
        this.tileId = tileId;
        this.dispatcher = dispatcher;
        this.ut = ut;
        this.appServices = appServices;
        this.model = new CollocModel({
            dispatcher: dispatcher,
            tileId: tileId,
            waitForTile: waitForTile,
            appServices: appServices,
            service: new KontextCollAPI(conf.apiURL),
            initState: {
                isBusy: false,
                isExpanded: false,
                error: null,
                corpname: conf.corpname,
                q: '',
                cattr: CorePosAttribute.LEMMA,
                cfromw: -2,
                ctow: 2,
                cminfreq: 1,
                cminbgr: 3,
                cbgrfns: [CollocMetric.MI, CollocMetric.T_SCORE, CollocMetric.LOG_DICE],
                csortfn: CollocMetric.MI,
                data: Immutable.List<DataRow>(),
                heading: [],
                citemsperpage: 10
            }
        });
    }

    init():void {
        this.view = viewInit(
            this.dispatcher,
            this.ut,
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

    supportsExtendedView():boolean {
        return true;
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


export const init:TileFactory.TileFactory<CollocationsTileConf> = ({tileId, dispatcher, appServices, ut, mainForm, waitForTile, conf}) => {
    return new CollocationsTile({tileId, dispatcher, appServices, ut, mainForm, waitForTile, conf});
}