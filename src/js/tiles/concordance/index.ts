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
import { IActionDispatcher, StatelessModel } from 'kombo';

import { AppServices } from '../../appServices';
import { QuerySelector } from '../../common/api/kontext/concordance';
import { Line, ViewMode } from '../../common/api/abstract/concordance';

import { DataApi, LocalizedConfMsg } from '../../common/types';
import { QueryType } from '../../common/query';
import { Backlink, CorpSrchTileConf, ITileProvider, TileComponent, TileFactory, SourceInfoComponent } from '../../common/tile';
import { ConcordanceTileModel } from './model';
import { init as viewInit } from './views';
import { createApiInstance, createMapperInstance, createSourceInfoApiInstance } from '../../common/api/factory/concordance';
import { createSourceInfoViewInstance } from './apiFactory';



declare var require:any;
require('./style.less');


export interface ConcordanceTileConf extends CorpSrchTileConf {
    apiURL:string;
    apiType:string;
    backlink?:Backlink;
    pageSize:number;
    posAttrs:Array<string>;
    posQueryGenerator:[string, string]; // a positional attribute name and a function to create a query value (e.g. ['tag', (v) => `${v}.+`])
    parallelLangMapping?:{[lang:string]:string};
    disableViewModes?:boolean;
    metadataAttrs?:Array<{value:string; label:LocalizedConfMsg}>;
}

/**
 *
 */
export class ConcordanceTile implements ITileProvider {

    private readonly tileId:number;

    private readonly dispatcher:IActionDispatcher;

    private readonly model:ConcordanceTileModel;

    private readonly appServices:AppServices;

    private view:TileComponent;

    private sourceInfoView:SourceInfoComponent;

    private readonly widthFract:number;

    private readonly label:string;

    private readonly sourceInfoService:DataApi<{}, {}>;

    private readonly blockingTiles:Array<number>;

    constructor({tileId, dispatcher, appServices, ut, mainForm, widthFract, waitForTiles, conf, lang2, isBusy, cache}:TileFactory.Args<ConcordanceTileConf>) {
        this.tileId = tileId;
        this.dispatcher = dispatcher;
        this.widthFract = widthFract;
        this.appServices = appServices;
        this.blockingTiles = waitForTiles;
        if (Array.isArray(waitForTiles) && waitForTiles.length > 1) {
            throw new Error('ConcordanceTile does not support waiting for multiple tiles. Only a single tile can be specified');
        }
        this.sourceInfoService = createSourceInfoApiInstance(conf.apiType, conf.apiURL, appServices.getApiHeaders(conf.apiURL));
        this.sourceInfoView = createSourceInfoViewInstance(conf.apiType, dispatcher, ut);

        this.model = new ConcordanceTileModel({
            dispatcher: dispatcher,
            tileId: tileId,
            appServices: appServices,
            service: createApiInstance(cache, conf.apiType, conf.apiURL, appServices.getApiHeaders(conf.apiURL)),
            sourceInfoService: this.sourceInfoService,
            stateToArgMapper: createMapperInstance(conf.apiType),
            mainForm: mainForm,
            backlink: conf.backlink || null,
            waitForTile: Array.isArray(waitForTiles) ? waitForTiles[0] : waitForTiles,
            initState: {
                tileId: tileId,
                isBusy: isBusy,
                error: null,
                isTweakMode: false,
                isMobile: appServices.isMobileMode(),
                widthFract: widthFract,
                concId: null,
                querySelector: QuerySelector.CQL,
                lines: Immutable.List<Line>(),
                corpname: conf.corpname,
                otherCorpname: conf.parallelLangMapping ? conf.parallelLangMapping[lang2] : null,
                subcname: Array.isArray(conf.subcname) ? conf.subcname[0] : conf.subcname,
                subcDesc: conf.subcDesc ? appServices.importExternalMessage(conf.subcDesc) : '',
                concsize: -1,
                numPages: -1,
                resultARF: -1,
                resultIPM: -1,
                pageSize: conf.pageSize,
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
                metadataAttrs: Immutable.List<{value:string; label:string}>(
                    (conf.metadataAttrs || []).map(v => ({value: v.value, label: appServices.importExternalMessage(v.label)})) || []),
                backlink: null,
                posQueryGenerator: conf.posQueryGenerator,
                disableViewModes: !!conf.disableViewModes
            }
        });
        this.label = appServices.importExternalMessage(conf.label || 'concordance__main_label');
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

    getSourceInfoView():SourceInfoComponent {
        return this.sourceInfoView;
    }

    getLabel():string {
        return this.label;
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

    supportsAltView():boolean {
        return false;
    }

    exposeModelForRetryOnError():StatelessModel<{}>|null {
        return this.model;
    }

    getBlockingTiles():Array<number> {
        return this.blockingTiles;
    }
}

export const TILE_TYPE = 'ConcordanceTile';

export const init:TileFactory.TileFactory<ConcordanceTileConf> = (args) => new ConcordanceTile(args);