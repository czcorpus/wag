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
import { ITileProvider, QueryType, TileFactory, TileComponent, TileConf } from '../../abstract/types';
import { AppServices } from '../../appServices';
import { FreqPieModel, FreqPieDataRow } from './model';
import {init as viewInit} from './view';
import { FreqDistribAPI } from '../../shared/api/kontextFreqs';


export interface FreqPieTileConf extends TileConf{
    tileType:'FreqPieTile';
    apiURL:string;
    corpname:string;
    fcrit:string;
    flimit:number;
    freqSort:string;
    fpage:number;
    fttIncludeEmpty:boolean;
}


export class FreqPieTile implements ITileProvider {

    private readonly tileId:number;

    private readonly label:string;

    private readonly appServices:AppServices;

    private readonly model:FreqPieModel;

    private readonly widthFract:number;

    private view:TileComponent;

    constructor(lang1:string, lang2:string, {tileId, dispatcher, appServices, ut, mainForm, waitForTiles, widthFract, conf}:TileFactory.Args<FreqPieTileConf>) {
        this.tileId = tileId;
        this.appServices = appServices;
        this.widthFract = widthFract;
        this.label = this.appServices.importExternalMessage(conf.label);
        this.model = new FreqPieModel(
            dispatcher,
            {
                isBusy: false,
                error: null,
                data: Immutable.List<FreqPieDataRow>(),
                corpname: conf.corpname,
                concId: null,
                fcrit: conf.fcrit,
                flimit: conf.flimit,
                freqSort: conf.freqSort,
                fpage: conf.fpage,
                fttIncludeEmpty: conf.fttIncludeEmpty
            },
            tileId,
            waitForTiles[0],
            appServices,
            new FreqDistribAPI(conf.apiURL)
        );
        this.view = viewInit(
            dispatcher,
            ut,
            this.model
        );
    }

    init():void {
    }

    getIdent():number {
        return this.tileId;
    }

    getLabel():string {
        return this.label ? this.label : this.appServices.translate('freqpie__main_label');
    }

    getView():TileComponent {
        return this.view;
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


export const init:TileFactory.TileFactory<FreqPieTileConf> = ({
    tileId, dispatcher, appServices, ut, mainForm, lang1, lang2, waitForTiles, widthFract, conf}) => {
    return new FreqPieTile(lang1, lang2, {tileId, dispatcher, appServices, ut, mainForm, widthFract, waitForTiles, conf});
}