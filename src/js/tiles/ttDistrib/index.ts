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
import { ITileProvider, TileFactory, QueryType } from '../../abstract/types';
import {init as viewInit} from './view';
import { ActionDispatcher, ViewUtils } from "kombo";
import { TTDistribModel } from "./model";
import { TTDistribAPI, DataRow } from "./api";
import { GlobalComponents } from "../../views/global";
import { WdglanceTilesModel } from "../../models/tiles";

declare var require:(src:string)=>void;  // webpack
require('./style.less');


export interface TTDistTileConf {
    apiURL:string;
    corpname:string;
    fcrit:string;
    flimit:number;
    freqSort:string;
    fpage:number;
    fttIncludeEmpty:boolean;
}


export class TTDistTile implements ITileProvider {

    private readonly dispatcher:ActionDispatcher;

    private readonly ut:ViewUtils<GlobalComponents>;

    private readonly tilesModel:WdglanceTilesModel;

    private readonly model:TTDistribModel;

    private readonly tileId:number;

    private view:React.ComponentClass<{}>;

    constructor(dispatcher:ActionDispatcher, tileId:number, ut:ViewUtils<GlobalComponents>, tilesModel:WdglanceTilesModel, conf:TTDistTileConf) {
        this.dispatcher = dispatcher;
        this.tileId = tileId;
        this.ut = ut;
        this.tilesModel = tilesModel;
        this.model = new TTDistribModel(
            this.dispatcher,
            tileId,
            new TTDistribAPI(conf.apiURL),
            tilesModel,
            {
                isBusy: false,
                error: null,
                data: Immutable.List<DataRow>(),
                renderFrameSize: [0, 0],
                corpname: conf.corpname,
                q: null,
                fcrit: conf.fcrit,
                flimit: conf.flimit,
                freqSort: conf.freqSort,
                fpage: conf.fpage,
                fttIncludeEmpty: conf.fttIncludeEmpty
            }
        );
    }

    init():void {
        this.view = viewInit(this.dispatcher, this.ut, this.model);
    }

    getIdent():number {
        return this.tileId;
    }

    getView():React.ComponentClass {
        return this.view;
    }

    supportsExtendedView():boolean {
        return false;
    }

    getLabel():string {
        return this.ut.translate('ttDistrib__main_label');
    }

    getQueryTypeSupport(qt:QueryType, lang1:string, lang2?:string):number {
        if (qt === QueryType.SINGLE_QUERY || qt === QueryType.TRANSLAT_QUERY) {
            return 1;
        }
        return 0;
    }

}


export const init:TileFactory.TileFactory<TTDistTileConf>  = ({tileId, dispatcher, ut, appServices, mainForm, conf, tilesModel}) => {
    return new TTDistTile(dispatcher, tileId, ut, tilesModel, conf);
}