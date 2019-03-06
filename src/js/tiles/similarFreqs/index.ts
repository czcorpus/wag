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
import { ITileProvider, TileComponent, QueryType, TileFactory, TileConf } from '../../common/types';
import { AppServices } from '../../appServices';
import { SimFreqsModel } from './model';
import {init as viewInit} from './view';
import { SimilarlyFreqWord, SimilarFreqWordsApi } from './api';

export interface SimilarFreqsTileConf extends TileConf {
    tileType:'SimilarFreqsTile';
    corpname:string;
    corpusSize:number;
    apiURL:string;

}

export class SimilarFreqsTile implements ITileProvider {

    private readonly tileId:number;

    private readonly label:string;

    private readonly appServices:AppServices;

    private readonly model:SimFreqsModel;

    private readonly widthFract:number;

    private view:TileComponent;

    constructor({tileId, dispatcher, appServices, ut, mainForm, widthFract, conf}:TileFactory.Args<SimilarFreqsTileConf>) {
        this.tileId = tileId;
        this.widthFract = widthFract;
        this.appServices = appServices;
        this.label = appServices.importExternalMessage(conf.label);
        this.model = new SimFreqsModel(
            dispatcher,
            {
                isBusy: false,
                error: null,
                corpname: conf.corpname,
                corpusSize: conf.corpusSize,
                data: Immutable.List<SimilarlyFreqWord>()
            },
            tileId,
            new SimilarFreqWordsApi(conf.apiURL, appServices.getApiHeaders(conf.apiURL)),
            mainForm
        )
        this.view = viewInit(dispatcher, ut, this.model);
    }

    getLabel():string {
        return this.label;
    }

    getIdent():number {
        return this.tileId;
    }

    getView():TileComponent {
        return this.view;
    }

    /**
     */
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

}


export const init:TileFactory.TileFactory<SimilarFreqsTileConf> = (args) => new SimilarFreqsTile(args);
