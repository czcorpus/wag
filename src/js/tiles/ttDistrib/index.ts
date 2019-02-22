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
import { ITileProvider, TileFactory, QueryType, TileComponent, TileConf, LocalizedConfMsg } from '../../common/types';
import {init as viewInit} from './view';
import { ActionDispatcher, ViewUtils } from "kombo";
import { TTDistribModel } from "./model";
import { DataRow, MultiBlockFreqDistribAPI } from "../../common/api/kontextFreqs";
import { GlobalComponents } from "../../views/global";
import { AppServices } from '../../appServices';
import { FreqDataBlock } from '../../common/models/freq';
import { puid } from '../../common/util';
import { Theme } from '../../common/theme';

declare var require:(src:string)=>void;  // webpack
require('./style.less');


export interface TTDistTileConf extends TileConf {
    tileType:'TTDistribTile';
    apiURL:string;
    corpname:string;
    fcrit:string|Array<string>;
    critLabels:LocalizedConfMsg|Array<LocalizedConfMsg>;
    flimit:number;
    freqSort:string;
    fpage:number;
    fttIncludeEmpty:boolean;
    maxNumCategories:number;
}


export class TTDistTile implements ITileProvider {

    private readonly dispatcher:ActionDispatcher;

    private readonly ut:ViewUtils<GlobalComponents>;

    private readonly model:TTDistribModel;

    private readonly tileId:number;

    private view:TileComponent;

    private readonly label:string;

    private readonly widthFract:number;

    private readonly appServices:AppServices;

    constructor({dispatcher, tileId, waitForTiles, ut, theme, appServices, widthFract, conf}:TileFactory.Args<TTDistTileConf>) {
        this.dispatcher = dispatcher;
        this.tileId = tileId;
        this.widthFract = widthFract;
        this.appServices = appServices;
        this.label = appServices.importExternalMessage(conf.label);
        const criteria = Immutable.List<string>(typeof conf.fcrit === 'string' ? [conf.fcrit] : conf.fcrit);
        const labels = Array.isArray(conf.critLabels) ?
            conf.critLabels.map(v => this.appServices.importExternalMessage(v)) :
            [this.appServices.importExternalMessage(conf.critLabels)];
        this.model = new TTDistribModel(
            this.dispatcher,
            tileId,
            waitForTiles[0],
            appServices,
            new MultiBlockFreqDistribAPI(conf.apiURL),
            {
                isBusy: false,
                error: null,
                blocks: Immutable.List<FreqDataBlock<DataRow>>(criteria.map(v => ({
                    data: Immutable.List<DataRow>(),
                    ident: puid()
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
                maxNumCategories: conf.maxNumCategories
            }
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
        return this.label ? this.label : this.ut.translate('ttDistrib__main_label');
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


export const init:TileFactory.TileFactory<TTDistTileConf>  = (args) => new TTDistTile(args);