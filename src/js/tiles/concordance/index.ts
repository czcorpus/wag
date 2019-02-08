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
import { ITileProvider, TileFactory, QueryType, TileComponent, TileConf } from '../../abstract/types';
import {init as viewInit} from './views';
import { ConcordanceTileModel } from './model';
import { ActionDispatcher, ViewUtils } from 'kombo';
import { ConcApi, Line, ViewMode } from '../../shared/api/concordance';
import { GlobalComponents } from '../../views/global';

declare var require:any;
require('./style.less');


export interface ConcordanceTileConf extends TileConf {
    tileType:'ConcordanceTile';
    apiURL:string;
    corpname:string;
    posAttrs:Array<string>;
}

/**
 *
 */
export class ConcordanceTile implements ITileProvider {

    private readonly tileId:number;

    private readonly dispatcher:ActionDispatcher;

    private readonly model:ConcordanceTileModel;

    private readonly ut:ViewUtils<GlobalComponents>;

    private view:TileComponent;

    private readonly widthFract:number;

    private readonly _isHidden:boolean;

    constructor({tileId, dispatcher, appServices, ut, mainForm, isHidden, widthFract, conf}:TileFactory.Args<ConcordanceTileConf>) {
        this.tileId = tileId;
        this.dispatcher = dispatcher;
        this._isHidden = !!isHidden;
        this.widthFract = widthFract;
        this.model = new ConcordanceTileModel({
            dispatcher: dispatcher,
            tileId: tileId,
            appServices: appServices,
            service: new ConcApi(conf.apiURL),
            mainForm: mainForm,
            initState: {
                tileId: tileId,
                isBusy: false,
                error: null,
                isTweakMode: false,
                lines: Immutable.List<Line>(),
                corpname: conf.corpname,
                fullsize: -1,
                concsize: -1,
                resultARF: -1,
                resultIPM: -1,
                pageSize: 20,
                currPage: 1,
                loadPage: 1,
                kwicLeftCtx: ConcordanceTileModel.BASIC_KWIC_CTX,
                kwicRightCtx: ConcordanceTileModel.BASIC_KWIC_CTX,
                attr_vmode: 'mouseover',
                viewMode: ViewMode.KWIC,
                attrs: Immutable.List<string>(conf.posAttrs)
            }
        });
        this.model.suspend
        this.ut = ut;
    }

    init():void {
        this.view = viewInit(this.dispatcher, this.ut, this.model);
    }

    getIdent():number {
        return this.tileId;
    }

    getView():TileComponent {
        return this.view;
    }

    getLabel():string {
        return this.ut.translate('concordance__main_label');
    }

    supportsQueryType(qt:QueryType, lang1:string, lang2?:string):boolean {
        return qt === QueryType.SINGLE_QUERY || qt === QueryType.TRANSLAT_QUERY;
    }

    disable():void {
        this.model.suspend(()=>undefined);
    }

    isHidden():boolean {
        return this._isHidden;
    }

    getWidthFract():number {
        return this.widthFract;
    }

    supportsTweakMode():boolean {
        return true;
    }

    supportsHelpView():boolean {
        return true;
    }
}

export const init:TileFactory.TileFactory<ConcordanceTileConf> = ({tileId, dispatcher, appServices, ut, mainForm, isHidden, widthFract, conf}) => {
    return new ConcordanceTile({tileId, dispatcher, appServices, ut, mainForm, isHidden, widthFract, conf});
}