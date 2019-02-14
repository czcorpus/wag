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
import { ITileProvider, TileFactory, QueryType, TileComponent, TileConf } from '../../abstract/types';
import {init as viewInit} from './view';
import { ActionDispatcher, ViewUtils } from "kombo";
import { TTDistribModel } from "./model";
import { FreqDistribAPI, DataRow } from "../../shared/api/kontextFreqs";
import { GlobalComponents } from "../../views/global";
import { AppServices } from '../../appServices';

declare var require:(src:string)=>void;  // webpack
require('./style.less');


export interface TTDistTileConf extends TileConf {
    tileType:'TTDistribTile';
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

    private readonly model:TTDistribModel;

    private readonly tileId:number;

    private view:TileComponent;

    private readonly label:string;

    private readonly widthFract:number;

    constructor(dispatcher:ActionDispatcher, tileId:number, waitForTile:number, ut:ViewUtils<GlobalComponents>, appServices:AppServices,
                widthFract:number, conf:TTDistTileConf) {
        this.dispatcher = dispatcher;
        this.tileId = tileId;
        this.ut = ut;
        this.widthFract = widthFract;
        this.label = appServices.importExternalMessage(conf.label);
        this.model = new TTDistribModel(
            this.dispatcher,
            tileId,
            waitForTile,
            appServices,
            new FreqDistribAPI(conf.apiURL),
            {
                isBusy: false,
                error: null,
                data: Immutable.List<DataRow>(),
                corpname: conf.corpname,
                concId: null,
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

    getView():TileComponent {
        return this.view;
    }

    getLabel():string {
        return this.label ? this.label : this.ut.translate('ttDistrib__main_label');
    }

    supportsQueryType(qt:QueryType, lang1:string, lang2?:string):boolean {
        return qt === QueryType.SINGLE_QUERY || qt === QueryType.TRANSLAT_QUERY;
    }

    disable():void {
        this.model.suspend(()=>undefined);
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


export const init:TileFactory.TileFactory<TTDistTileConf>  = ({tileId, waitForTiles, dispatcher, ut, appServices, mainForm, widthFract, conf}) => {
    return new TTDistTile(dispatcher, tileId, waitForTiles[0], ut, appServices, widthFract, conf);
}