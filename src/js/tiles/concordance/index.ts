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
import { ITileProvider, TileFactory, QueryType, TileComponent, Backlink, CorpSrchTileConf } from '../../common/types';
import {init as viewInit} from './views';
import { ConcordanceTileModel } from './model';
import { ActionDispatcher } from 'kombo';
import { ConcApi, Line, ViewMode, QuerySelector } from '../../common/api/concordance';
import { AppServices } from '../../appServices';

declare var require:any;
require('./style.less');


export interface ConcordanceTileConf extends CorpSrchTileConf {
    tileType:'ConcordanceTile';
    apiURL:string;
    backlink:Backlink;
    posAttrs:Array<string>;
    parallelLangMapping?:{[lang:string]:string};
}

/**
 *
 */
export class ConcordanceTile implements ITileProvider {

    private readonly tileId:number;

    private readonly dispatcher:ActionDispatcher;

    private readonly model:ConcordanceTileModel;

    private readonly appServices:AppServices;

    private view:TileComponent;

    private readonly widthFract:number;

    constructor({tileId, dispatcher, appServices, ut, mainForm, widthFract, conf, lang2}:TileFactory.Args<ConcordanceTileConf>) {
        this.tileId = tileId;
        this.dispatcher = dispatcher;
        this.widthFract = widthFract;
        this.appServices = appServices;
        this.model = new ConcordanceTileModel({
            dispatcher: dispatcher,
            tileId: tileId,
            appServices: appServices,
            service: new ConcApi(conf.apiURL),
            mainForm: mainForm,
            backlink: conf.backlink || null,
            initState: {
                tileId: tileId,
                isBusy: false,
                error: null,
                isTweakMode: false,
                isMobile: appServices.isMobileMode(),
                widthFract: widthFract,
                querySelector: QuerySelector.WORD,
                lines: Immutable.List<Line>(),
                corpname: conf.corpname,
                otherCorpname: conf.parallelLangMapping ? conf.parallelLangMapping[lang2] : null,
                subcname: Array.isArray(conf.subcname) ? conf.subcname[0] : conf.subcname,
                fullsize: -1,
                concsize: -1,
                numPages: -1,
                resultARF: -1,
                resultIPM: -1,
                pageSize: 20,
                currPage: 1,
                loadPage: 1,
                shuffle: true,
                initialKwicLeftCtx: this.calcContext(widthFract),
                initialKwicRightCtx: this.calcContext(widthFract),
                kwicLeftCtx: appServices.isMobileMode() ? ConcordanceTileModel.CTX_SIZES[0] : this.calcContext(widthFract),
                kwicRightCtx: appServices.isMobileMode() ? ConcordanceTileModel.CTX_SIZES[0] : this.calcContext(widthFract),
                attr_vmode: 'mouseover',
                viewMode: conf.parallelLangMapping ? ViewMode.SENT : ViewMode.KWIC,
                attrs: Immutable.List<string>(conf.posAttrs),
                backlink: null
            }
        });
        this.model.suspend
        this.view = viewInit(this.dispatcher, ut, this.model);
    }

    private calcContext(widthFract:number|undefined):number {
        return ConcordanceTileModel.CTX_SIZES[widthFract || 0] || ConcordanceTileModel.CTX_SIZES[0];
    }

    getIdent():number {
        return this.tileId;
    }

    getView():TileComponent {
        return this.view;
    }

    getLabel():string {
        return this.appServices.translate('concordance__main_label');
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
        return true;
    }

    supportsHelpView():boolean {
        return true;
    }
}

export const init:TileFactory.TileFactory<ConcordanceTileConf> = (args) => new ConcordanceTile(args);