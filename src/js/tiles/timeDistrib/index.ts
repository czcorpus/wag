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
import * as React from 'react';
import * as Immutable from 'immutable';
import { ITileProvider, TileFactory } from '../../abstract/types';
import { ActionDispatcher, ViewUtils } from 'kombo';
import { GlobalComponents } from '../../views/global';
import { TimeDistribModel } from './model';
import { TimeDistribAPI, DataItem } from './api';
import {init as viewInit} from './view';
import { WdglanceTilesModel } from '../../models/tiles';

declare var require:(src:string)=>void;  // webpack
require('./style.less');


export interface TimeDistTileConf {

    apiURL:string;

    corpname:string;

    /**
     * E.g. 'lemma', 'word'
     */
    distProperty:string;

    /**
     * E.g. doc.pubyear
     */
    timeProperty:string;
}


export class TimeDistTile implements ITileProvider {

    private readonly dispatcher:ActionDispatcher;

    private readonly tileId:number;

    private readonly ut:ViewUtils<GlobalComponents>;

    private readonly model:TimeDistribModel;

    // a (time based) structural attribute property we are looking for in this tile
    private readonly distProperty:string;

    private view:React.ComponentClass;

    constructor(dispatcher:ActionDispatcher, tileId:number, ut:ViewUtils<GlobalComponents>, tilesModel:WdglanceTilesModel, conf:TimeDistTileConf) {
        this.dispatcher = dispatcher;
        this.tileId = tileId;
        this.ut = ut;
        this.distProperty = conf.distProperty;
        this.model = new TimeDistribModel(
            dispatcher,
            {
                isBusy: false,
                error: null,
                corpname: conf.corpname,
                q: null,
                renderFrameSize: [0, 0],
                data: Immutable.List<DataItem>()
            },
            tileId,
            new TimeDistribAPI(conf.apiURL),
            tilesModel
        );
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
        return this.ut.translate('timeDistrib__main_label_{property}', {property: this.distProperty});
    }

    supportsSingleWordQuery(language:string):boolean {
        return true; // TODO
    }

    supportsTwoWordQuery(language1:string, language2:string):boolean {
        return true; // TODO
    }

}



export const init:TileFactory.TileFactory<TimeDistTileConf>  = ({tileId, dispatcher, ut, appServices, mainForm, conf, tilesModel}) => {
    return new TimeDistTile(dispatcher, tileId, ut, tilesModel, conf);
}