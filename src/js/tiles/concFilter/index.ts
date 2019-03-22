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
import { ActionDispatcher } from 'kombo';

import { AppServices } from '../../appServices';
import { TileConf, ITileProvider, TileFactory, TileComponent, QueryType } from '../../common/types';
import { ConcFilterModel } from './model';
import { init as viewInit } from './view';
import { ConcApi, Line, ViewMode } from '../../common/api/kontext/concordance';


declare var require:(src:string)=>void;  // webpack
require('./style.less');


export interface ConcFilterTileConf extends TileConf {
    tileType:'ConcFilterTile';
    apiURL:string;
    corpname:string;
    posAttrs:Array<string>;
}

/**
 *
 */
export class ConcFilterTile implements ITileProvider {

    private readonly tileId:number;

    private readonly dispatcher:ActionDispatcher;

    private readonly model:ConcFilterModel;

    private readonly appServices:AppServices;

    private view:TileComponent;

    private readonly widthFract:number;

    private readonly label:string;

    constructor({tileId, waitForTiles, dispatcher, appServices, ut, widthFract, conf, theme}:TileFactory.Args<ConcFilterTileConf>) {
        this.tileId = tileId;
        this.dispatcher = dispatcher;
        this.widthFract = widthFract;
        this.appServices = appServices;
        this.model = new ConcFilterModel(
            dispatcher,
            tileId,
            waitForTiles,
            appServices,
            new ConcApi(conf.apiURL, appServices.getApiHeaders(conf.apiURL)),
            {
                isBusy: false,
                error: null,
                isTweakMode: false,
                isMobile: appServices.isMobileMode(),
                widthFract: widthFract,
                corpname: conf.corpname,
                posAttrs: Immutable.List<string>(conf.posAttrs),
                lines: Immutable.List<Line>(),
                viewMode: ViewMode.SENT,
                attrVmode: 'mouseover'
            }
        );
        this.label = appServices.importExternalMessage(conf.label || 'collexamples__main_label');
        this.view = viewInit(this.dispatcher, ut, theme, this.model);
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

    supportsAltView():boolean {
        return false;
    }
}


export const init:TileFactory.TileFactory<ConcFilterTileConf> = (args) => new ConcFilterTile(args);