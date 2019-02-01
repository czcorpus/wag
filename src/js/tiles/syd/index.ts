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

import { TileFactory, ITileProvider, QueryType, TileComponent, TileConf } from '../../abstract/types';
import { ActionDispatcher, ViewUtils } from 'kombo';
import { GlobalComponents } from '../../views/global';
import { AppServices } from '../../appServices';
import {init as viewInit} from './view';
import { SydModel } from './model';
import { WdglanceMainFormModel } from '../../models/query';
import { SyDAPI } from './api';

declare var require:any;
require('./style.less');

export interface SyDTileConf extends TileConf {
    apiURL:string;
}

/**
 *
 */
export class SyDTile implements ITileProvider {

    private readonly tileId:number;

    private readonly view:TileComponent;

    private readonly model:SydModel;

    private readonly appServices:AppServices;

    constructor(dispatcher:ActionDispatcher, tileId:number, ut:ViewUtils<GlobalComponents>, mainForm:WdglanceMainFormModel,
            appServices:AppServices, conf:SyDTileConf) {
        this.tileId = tileId;
        this.appServices = appServices;
        this.model = new SydModel(
            dispatcher,
            {
                isBusy: false,
                error: null
            },
            mainForm,
            new SyDAPI(conf.apiURL)
        );
        this.view = viewInit(dispatcher, ut, this.model);
    }

    init():void {

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
        return this.appServices.translate('syd_main_label');
    }

    getQueryTypeSupport(qt:QueryType, lang1:string, lang2?:string):number {
        if (qt === QueryType.CMP_QUERY) {
            return 100;
        }
        return 0;
    }

    isHidden():boolean {
        return false;
    }
}


export const init:TileFactory.TileFactory<SyDTileConf> = ({
    tileId, dispatcher, appServices, ut, mainForm, lang1, lang2, conf}) => {
    return new SyDTile(dispatcher, tileId, ut, mainForm, appServices, conf);
}