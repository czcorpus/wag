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
import { IActionDispatcher, StatelessModel } from 'kombo';

import { AppServices } from '../../../appServices';
import { QueryType } from '../../../common/query';
import { HtmlModel } from './model';
import { RawHtmlAPI, WiktionaryHtmlAPI } from './service';
import { init as viewInit } from './views';
import { TileConf, ITileProvider, TileComponent, TileFactory } from '../../../common/tile';


declare var require:(src:string)=>void;  // webpack
require('./style.less');

export enum HtmlApiType {
    RAW = 'raw',
    WIKTIONARY = 'wiktionary'
}

export interface HtmlTileConf extends TileConf {
    apiURL:string;
    apiType:HtmlApiType;
    maxTileHeight?:string;
    args?:{[key:string]:string};
    lemmaArg?:string;
}

/**
 *
 */
export class HtmlTile implements ITileProvider {

    private readonly tileId:number;

    private readonly dispatcher:IActionDispatcher;

    private readonly appServices:AppServices;

    private readonly model:HtmlModel;

    private readonly widthFract:number;

    private readonly label:string;

    private view:TileComponent;

    constructor({tileId, dispatcher, appServices, ut, theme, widthFract, conf, isBusy, cache, mainForm}:TileFactory.Args<HtmlTileConf>) {
        this.tileId = tileId;
        this.dispatcher = dispatcher;
        this.appServices = appServices;
        this.widthFract = widthFract;

        let ServiceClass = null;
        switch (conf.apiType) {
            case HtmlApiType.WIKTIONARY:
                ServiceClass = WiktionaryHtmlAPI;
                break;
            default:
                ServiceClass = RawHtmlAPI;
        }

        this.model = new HtmlModel({
            dispatcher: dispatcher,
            tileId: tileId,
            appServices: appServices,
            service: new ServiceClass(cache, conf.apiURL),
            mainForm: mainForm,
            maxTileHeight: conf.maxTileHeight,
            initState: {
                isBusy: isBusy,
                tileId: tileId,
                widthFract: widthFract,
                error: null,
                data: null,
                args: conf.args,
                lemmaArg: conf.lemmaArg
            }
        });
        this.label = appServices.importExternalMessage(conf.label || 'html__main_label');
        this.view = viewInit(
            this.dispatcher,
            ut,
            theme,
            this.model
        );
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

    getSourceInfoComponent():null {
        return null;
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

    supportsAltView():boolean {
        return false;
    }

    exposeModelForRetryOnError():StatelessModel<{}>|null {
        return this.model;
    }

    getBlockingTiles():Array<number> {
        return [];
    }
}

export const TILE_TYPE = 'HtmlTile';

export const init:TileFactory.TileFactory<HtmlTileConf> = (args) => new HtmlTile(args);