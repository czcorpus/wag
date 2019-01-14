/*
 * Copyright 2018 Tomas Machalek <tomas.machalek@gmail.com>
 * Copyright 2018 Institute of the Czech National Corpus,
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

import { ITileProvider, TileFactory } from "../../abstract/types";
import {init as viewInit} from './views/main';
import { ActionDispatcher, ViewUtils } from "kombo";
import { TTDistribModel } from "./model";
import { DummyAPI } from "./api";
import { GlobalComponents } from "../../views/global";
import { WdglanceTilesModel } from "../../models/tiles";


export interface TTDistTileConf {

}


export class TTDistTile implements ITileProvider {

    private readonly dispatcher:ActionDispatcher;

    private readonly ut:ViewUtils<GlobalComponents>;

    private readonly tilesModel:WdglanceTilesModel;

    private readonly model:TTDistribModel;

    private readonly tileId:number;

    private view:React.ComponentClass<{}>;

    constructor(dispatcher:ActionDispatcher, tileId:number, ut:ViewUtils<GlobalComponents>, tilesModel:WdglanceTilesModel) {
        this.dispatcher = dispatcher;
        this.tileId = tileId;
        this.ut = ut;
        this.tilesModel = tilesModel;
        this.model = new TTDistribModel(this.dispatcher, tileId, new DummyAPI(), tilesModel, {});
    }

    init():void {
        this.view = viewInit(this.dispatcher, this.ut, this.model);
    }

    getIdent():number {
        return this.tileId;
    }

    getView():React.ComponentClass {
        return this.view;
    }

    supportsExtendedView():boolean {
        return false;
    }

    getLabel():string {
        return this.ut.translate('ttDistrib__main_label');
    }

    supportsSingleWordQuery(language:string):boolean {
        return true; // TODO
    }

    supportsTwoWordQuery(language1:string, language2:string):boolean {
        return true; // TODO
    }

}


export const init:TileFactory.TileFactory<TTDistTileConf>  = ({tileId, dispatcher, ut, appServices, mainForm, tilesModel}) => {
    return new TTDistTile(dispatcher, tileId, ut, tilesModel);
}