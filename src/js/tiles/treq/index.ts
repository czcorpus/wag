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
import { SearchPackages, TreqAPI, TreqTranslation } from './api';
import { TreqModel } from './model';
import { init as viewInit } from './view';

declare var require:any;
require('./style.less');

export interface TreqTileConf extends TileConf {
    tileType:'TreqTile';
    apiURL:string;
    srchPackages:SearchPackages;
}

/**
 *
 */
export class TreqTile implements ITileProvider {

    private readonly tileId:number;

    private readonly appServices:AppServices;

    private readonly model:TreqModel;

    private view:TileComponent;

    private readonly widthFract:number;

    constructor({tileId, dispatcher, appServices, ut, lang1, lang2, mainForm, widthFract, conf}:TileFactory.Args<TreqTileConf>) {
        this.tileId = tileId;
        this.appServices = appServices;
        this.widthFract = widthFract;
        this.model = new TreqModel(
            dispatcher,
            {
                isBusy: false,
                error: null,
                lang1: lang1,
                lang2: lang2,
                searchPackages: Immutable.List<string>(conf.srchPackages[lang2] || []),
                translations: Immutable.List<TreqTranslation>(),
                sum: 0,
                treqBackLink: null
            },
            tileId,
            new TreqAPI(conf.apiURL),
            conf.backlink || null,
            mainForm
        );
        this.view = viewInit(
            dispatcher,
            ut,
            this.model
        );
    }

    getIdent():number {
        return this.tileId;
    }

    getLabel():string {
        return this.appServices.translate('treq__main_label');
    }

    getView():TileComponent {
        return this.view;
    }

    supportsQueryType(qt:QueryType, lang1:string, lang2?:string):boolean {
        return qt === QueryType.TRANSLAT_QUERY;
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


export const init:TileFactory.TileFactory<TreqTileConf> = (args) => new TreqTile(args);