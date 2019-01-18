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

import * as Immutable from 'immutable';
import { ITileProvider, TileFactory } from '../../abstract/types';
import {init as viewInit} from './views';
import { ConcordanceTileModel } from './model';
import { ActionDispatcher, ViewUtils } from 'kombo';
import { RequestBuilder, Line } from './service';
import { GlobalComponents } from '../../views/global';

declare var require:any;
require('./style.less');


export interface ConcordanceTileConf {
    apiURL:string;
    corpname:string;
}

/**
 *
 */
export class ConcordanceTile implements ITileProvider {

    private readonly tileId:number;

    private readonly dispatcher:ActionDispatcher;

    private readonly model:ConcordanceTileModel;

    private readonly ut:ViewUtils<GlobalComponents>;

    private view:React.ComponentClass<{}>;

    constructor({tileId, dispatcher, appServices, ut, mainForm, conf}:TileFactory.Args<ConcordanceTileConf>) {
        this.tileId = tileId;
        this.dispatcher = dispatcher;
        this.model = new ConcordanceTileModel({
            dispatcher: dispatcher,
            tileId: tileId,
            appServices: appServices,
            service: new RequestBuilder(conf.apiURL),
            mainForm: mainForm,
            initState: {
                isBusy: false,
                isExpanded: false,
                lines: Immutable.List<Line>(),
                corpname: conf.corpname,
                fullsize: -1,
                concsize: -1,
                resultARF: -1,
                resultIPM: -1
            }
        });
        this.ut = ut;
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
        return true;
    }

    getLabel():string {
        return this.ut.translate('concordance__main_label');
    }

    supportsSingleWordQuery(language:string):boolean {
        return true; // TODO
    }

    supportsTwoWordQuery(language1:string, language2:string):boolean {
        return true; // TODO
    }
}

export const init:TileFactory.TileFactory<ConcordanceTileConf> = ({tileId, dispatcher, appServices, ut, mainForm, tilesModel, conf}) => {
    return new ConcordanceTile({tileId, dispatcher, appServices, ut, mainForm, tilesModel, conf});
}