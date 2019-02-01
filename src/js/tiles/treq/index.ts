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
import { TileFactory, ITileProvider, QueryType, TileComponent } from '../../abstract/types';
import { AppServices } from '../../appServices';
import {init as viewInit} from './view';
import { TreqModel } from './model';
import { TreqAPI, TreqTranslation, SearchPackages } from './api';
declare var require:any;
require('./style.less');

export interface TreqTileConf {
    apiURL:string;
    backlinkURL:string;
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

    constructor(lang1:string, lang2:string, {tileId, dispatcher, appServices, ut, mainForm, conf}:TileFactory.Args<TreqTileConf>) {
        this.tileId = tileId;
        this.appServices = appServices;
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
                treqBackLinkArgs: null,
                treqBackLinkRootURL: conf.backlinkURL
            },
            tileId,
            new TreqAPI(conf.apiURL),
            mainForm
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
        return this.appServices.translate('treq__main_label');
    }

    getView():TileComponent {
        return this.view;
    }

    supportsExtendedView():boolean {
        return false;
    }

    getQueryTypeSupport(qt:QueryType, lang1:string, lang2?:string):number {
        if (qt === QueryType.TRANSLAT_QUERY) {
            return 1000;
        }
        return 0;
    }

    isHidden():boolean {
        return false;
    }
}


export const init:TileFactory.TileFactory<TreqTileConf> = ({
    tileId, dispatcher, appServices, ut, mainForm, lang1, lang2, conf}) => {
    return new TreqTile(lang1, lang2, {tileId, dispatcher, appServices, ut, mainForm, conf});
}