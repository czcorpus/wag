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

import { AppServices } from '../../appServices';
import { ITileProvider, QueryType, TileComponent, TileConf, TileFactory } from '../../common/types';
import { FreqDBRow, FreqDbAPI } from './api';
import { FlevelDistribItem, SummaryModel } from './model';
import { init as viewInit } from './views';

declare var require:(src:string)=>void;  // webpack
require('./style.less');


export interface WordFreqTileConf extends TileConf {
    tileType:'WordFreqTile';
    apiURL:string;
    corpname:string;
    corpusSize:number;
    fcrit:string;
    flimit:number;
    freqSort:string;
    fpage:number;
    fttIncludeEmpty:boolean;
    sfwRowRange:number;
    flevelDistrib?:Array<FlevelDistribItem>;
}

const defaultFlevelDistrib = [
    {rel: 71.5079, flevel: 1.0}, {rel: 19.9711, flevel: 2.0}, {rel: 6.2886, flevel: 3.0},
    {rel: 1.8387, flevel: 4.0}, {rel: 0.3606, flevel: 5.0}, {rel: 0.0293, flevel: 6.0},
    {rel: 0.0037, flevel: 7.0}
];

export class WordFreqTile implements ITileProvider {

    private readonly tileId:number;

    private readonly label:string;

    private readonly appServices:AppServices;

    private readonly model:SummaryModel;

    private readonly widthFract:number;

    private readonly view:TileComponent;

    constructor({tileId, dispatcher, appServices, ut, mainForm, widthFract, conf}:TileFactory.Args<WordFreqTileConf>) {
        this.tileId = tileId;
        this.appServices = appServices;
        this.widthFract = widthFract;
        this.label = this.appServices.importExternalMessage(conf.label);
        this.model = new SummaryModel(
            dispatcher,
            {
                isBusy: false,
                error: null,
                corpname: conf.corpname,
                corpusSize: conf.corpusSize,
                fcrit: conf.fcrit,
                flimit: conf.flimit,
                fpage: conf.fpage,
                freqSort: conf.freqSort,
                includeEmpty: conf.fttIncludeEmpty,
                data: Immutable.List<FreqDBRow>(),
                sfwRowRange: conf.sfwRowRange,
                flevelDistrb: Immutable.List<FlevelDistribItem>(
                    conf.flevelDistrib ? conf.flevelDistrib : defaultFlevelDistrib
                )
            },
            tileId,
            new FreqDbAPI(conf.apiURL, appServices.getApiHeaders(conf.apiURL)),
            mainForm,
            appServices
        );
        this.label = appServices.importExternalMessage(conf.label || 'freqpie__main_label');
        this.view = viewInit(dispatcher, ut, this.model);
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

    supportsQueryType(qt:QueryType, lang1:string, lang2?:string):boolean {
        return qt === QueryType.SINGLE_QUERY;
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

    supportsAltView():boolean {
        return false;
    }
}


export const init:TileFactory.TileFactory<WordFreqTileConf> = (args) => new WordFreqTile(args);