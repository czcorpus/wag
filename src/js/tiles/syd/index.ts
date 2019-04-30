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
import { QueryType } from '../../common/types';
import { ITileProvider, TileComponent, TileConf, TileFactory } from '../../common/tile';
import { StrippedFreqResponse, SyDAPI } from './api';
import { SydModel } from './model';
import { init as viewInit } from './view';

declare var require:any;
require('./style.less');

export interface SyDTileConf extends TileConf {
    tileType:'SyDTile';
    apiURL:string;
    concApiURL:string;
    corp1:string;
    corp1Fcrit:Array<string>;
    corp2:string;
    corp2Fcrit:Array<string>;
}

/**
 *
 */
export class SyDTile implements ITileProvider {

    private readonly tileId:number;

    private readonly view:TileComponent;

    private readonly model:SydModel;

    private readonly appServices:AppServices;

    private readonly widthFract:number;

    private readonly label:string;

    constructor({dispatcher, tileId, waitForTiles, ut, mainForm, appServices, widthFract, conf}:TileFactory.Args<SyDTileConf>) {
        this.tileId = tileId;
        this.appServices = appServices;
        this.widthFract = widthFract;
        this.model = new SydModel(
            dispatcher,
            {
                isBusy: false,
                error: null,
                procTime: -1,
                corp1: conf.corp1,
                corp1Fcrit: Immutable.List<string>(conf.corp1Fcrit),
                corp2: conf.corp2,
                corp2Fcrit: Immutable.List<string>(conf.corp2Fcrit),
                flimit: 1, // TODO
                freqSort: '', // TODO
                fpage: 1, // TODO
                fttIncludeEmpty: false,
                result: Immutable.List<StrippedFreqResponse>()
            },
            tileId,
            waitForTiles[0],
            mainForm,
            appServices,
            new SyDAPI(conf.apiURL, conf.concApiURL, appServices.getApiHeaders(conf.apiURL))
        );
        this.label = appServices.importExternalMessage(conf.label || 'syd_main_label');
        this.view = viewInit(dispatcher, ut, this.model);
    }

    getIdent():number {
        return this.tileId;
    }

    getView():TileComponent {
        return this.view;
    }

    getSourceInfoView():null {
        return null;
    }

    getLabel():string {
        return this.label;
    }

    supportsQueryType(qt:QueryType, lang1:string, lang2?:string):boolean {
        return qt === QueryType.CMP_QUERY;
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


export const init:TileFactory.TileFactory<SyDTileConf> = (args) => new SyDTile(args);