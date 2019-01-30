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
import { ITileProvider, QueryType, TileFactory, TileComponent } from '../../abstract/types';
import { AppServices } from '../../appServices';
import { SocioModel, SocioDataRow } from './model';
import {init as viewInit} from './view';
import { FreqDistribAPI } from '../../shared/api/kontextFreqs';


export interface SocioTileConf {
    apiURL:string;
    subTitle:string;
    corpname:string;
    fcrit:string;
    flimit:number;
    freqSort:string;
    fpage:number;
    fttIncludeEmpty:boolean;
}


export class SocioTile implements ITileProvider {

    private readonly tileId:number;

    private readonly subTitle:string;

    private readonly appServices:AppServices;

    private readonly model:SocioModel;

    private view:TileComponent;

    constructor(lang1:string, lang2:string, {tileId, dispatcher, appServices, ut, mainForm, conf}:TileFactory.Args<SocioTileConf>) {
        this.tileId = tileId;
        this.appServices = appServices;
        this.subTitle = this.appServices.translate(conf.subTitle);
        this.model = new SocioModel(
            dispatcher,
            {
                isBusy: false,
                error: null,
                data: Immutable.List<SocioDataRow>(),
                corpname: conf.corpname,
                q: null,
                fcrit: conf.fcrit,
                flimit: conf.flimit,
                freqSort: conf.freqSort,
                fpage: conf.fpage,
                fttIncludeEmpty: conf.fttIncludeEmpty
            },
            tileId,
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
        return `${this.appServices.translate('socio__main_label')} - ${this.subTitle}`;
    }

    getView():TileComponent {
        return this.view;
    }

    supportsExtendedView():boolean {
        return false;
    }

    getQueryTypeSupport(qt:QueryType, lang1:string, lang2?:string):number {
        if (qt === QueryType.SINGLE_QUERY || qt === QueryType.TRANSLAT_QUERY) {
            return 1;
        }
        return 0;
    }
}


export const init:TileFactory.TileFactory<SocioTileConf> = ({
    tileId, dispatcher, appServices, ut, mainForm, lang1, lang2, conf}) => {
    return new SocioTile(lang1, lang2, {tileId, dispatcher, appServices, ut, mainForm, conf});
}