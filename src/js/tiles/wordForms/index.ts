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

import { ITileProvider, TileFactory, TileComponent, SourceInfoComponent, TileConf } from '../../common/tile';
import { AppServices } from '../../appServices';
import { StatelessModel } from 'kombo';
import { WordFormsModel } from './model';
import { QueryType } from '../../common/query';
import { init as viewInit } from './views';
import { createApiInstance } from './apiFactory';


export interface WordFormsTileConf extends TileConf {
    tileType:'WordFormsTile';
    apiType:string;
    apiURL:string;
    corpname:string;
    maxNumItems:number;
}


export class WordFormsTile implements ITileProvider {

    private readonly tileId:number;

    private readonly label:string;

    private readonly appServices:AppServices;

    private readonly model:WordFormsModel;

    private readonly widthFract:number;

    private readonly view:TileComponent;

    private readonly waitForTiles:Array<number>;

    constructor({tileId, dispatcher, appServices, ut, mainForm, widthFract, conf, isBusy, waitForTiles, theme}:TileFactory.Args<WordFormsTileConf>) {
        this.tileId = tileId;
        this.appServices = appServices;
        this.widthFract = widthFract;
        this.waitForTiles = waitForTiles;
        this.label = this.appServices.importExternalMessage(conf.label || 'wordforms__main_label');
        this.model = new WordFormsModel(
            dispatcher,
            {
                isBusy: isBusy,
                isAltViewMode: false,
                error: null,
                corpname: conf.corpname,
                roundToPos: 1,
                maxNumItems: conf.maxNumItems,
                data: Immutable.List<any>()
            },
            tileId,
            createApiInstance(conf.apiType, conf.apiURL, appServices.getApiHeaders(conf.apiURL)),
            mainForm,
            waitForTiles.length > 0 ? waitForTiles[0] : null
        );
        this.view = viewInit(dispatcher, ut, theme, this.model);
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

    getSourceInfoView():SourceInfoComponent|null {
        return null;
    }

    supportsQueryType(qt:QueryType, lang1:string, lang2?:string):boolean {
        return qt === QueryType.SINGLE_QUERY;
    }

    disable():void {} // ??

    getWidthFract():number {
        return this.widthFract;
    }

    supportsTweakMode():boolean {
        return false;
    }

    supportsAltView():boolean {
        return true;
    }

    exposeModelForRetryOnError():StatelessModel<{}>|null {
        return this.model;
    }

    /**
     * Return a list of tiles this tile depends on
     */
    getBlockingTiles():Array<number> {
        return this.waitForTiles;
    }

}


export const init:TileFactory.TileFactory<WordFormsTileConf> = (args) => new WordFormsTile(args);