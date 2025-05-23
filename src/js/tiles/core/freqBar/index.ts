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
import { IActionDispatcher, ViewUtils } from 'kombo';

import { IAppServices } from '../../../appServices.js';
import { LocalizedConfMsg } from '../../../types.js';
import { QueryType } from '../../../query/index.js';
import {
    TileComponent, TileConf, TileFactory, ITileProvider, TileFactoryArgs,
    DEFAULT_ALT_VIEW_ICON, ITileReloader, AltViewIconProps } from '../../../page/tile.js';
import { GlobalComponents } from '../../../views/common/index.js';
import { FreqBarModel } from './model.js';
import { init as viewInit } from './view.js';
import { findCurrentMatches } from '../wordFreq/model.js';
import { MQueryFreqDistribAPI } from '../../../api/vendor/mquery/freqs.js';


export interface FreqBarTileConf extends TileConf {
    apiURL:string;
    corpname:string|null; // null can be used in case subqueryMode is enabled
    subcname?:string;
    fcrit:string;
    freqType:'tokens'|'text-types';
    label:LocalizedConfMsg;
    flimit:number;
    fpage:number;
    matchCase:boolean;

    /**
     * A positional attribute name and a function to create a query value (e.g. ['tag', (v) => `${v}.+`]).
     */
    posQueryGenerator?:[string, string];
}


export class FreqBarTile implements ITileProvider {

    private readonly dispatcher:IActionDispatcher;

    private readonly ut:ViewUtils<GlobalComponents>;

    private readonly model:FreqBarModel;

    private readonly tileId:number;

    private view:TileComponent;

    private readonly label:string;

    private readonly widthFract:number;

    private readonly appServices:IAppServices;

    private readonly blockingTiles:Array<number>;

    private readonly readDataFromTile:number;

    constructor({
        dispatcher, tileId, ut, theme, appServices, widthFract, conf, isBusy,
        useDataStream, readDataFromTile, queryMatches
    }:TileFactoryArgs<FreqBarTileConf>) {

        this.dispatcher = dispatcher;
        this.tileId = tileId;
        this.widthFract = widthFract;
        this.appServices = appServices;
        this.readDataFromTile = readDataFromTile;
        this.label = appServices.importExternalMessage(conf.label);
        this.model = new FreqBarModel({
            dispatcher,
            tileId,
            appServices,
            queryMatches: findCurrentMatches(queryMatches),
            api: new MQueryFreqDistribAPI(conf.apiURL, appServices, useDataStream, conf.backlink),
            readDataFromTile,
            initState: {
                isBusy,
                error: null,
                freqData: {rows: []},
                activeBlock: 0,
                tileBoxSize: [100, 100],
                corpname: conf.corpname,
                subcname: conf.subcname,
                concId: null,
                posQueryGenerator: conf.posQueryGenerator,
                fcrit: conf.fcrit,
                matchCase: !!conf.matchCase,
                label: this.appServices.importExternalMessage(conf.label),
                freqType: conf.freqType,
                flimit: conf.flimit,
                fpage: conf.fpage,
                fmaxitems: 100,
                backlink: null,
                subqSyncPalette: false,
                isAltViewMode: false
            }
        });
        this.label = appServices.importExternalMessage(conf.label || 'freqBar__main_label');
        this.view = viewInit(this.dispatcher, ut, theme, this.model);
    }

    getIdent():number {
        return this.tileId;
    }

    getView():TileComponent {
        return this.view;
    }

    getSourceInfoComponent():null {
        return null;
    }

    getLabel():string {
        return this.label;
    }

    supportsQueryType(qt:QueryType, translatLang?:string):boolean {
        return qt === QueryType.SINGLE_QUERY || qt === QueryType.TRANSLAT_QUERY;
    }

    disable():void {
        this.model.waitForAction({}, (_, syncData)=>syncData);
    }

    getWidthFract():number {
        return this.widthFract;
    }

    supportsTweakMode():boolean {
        return false;
    }

    supportsAltView():boolean {
        return true;
    }

    getAltViewIcon():AltViewIconProps {
        return DEFAULT_ALT_VIEW_ICON;
    }

    registerReloadModel(model:ITileReloader):boolean {
        model.registerModel(this, this.model);
        return true;
    }

    getBlockingTiles():Array<number> {
        return this.blockingTiles;
    }

    supportsMultiWordQueries():boolean {
        return true;
    }

    getIssueReportingUrl():null {
        return null;
    }

    supportsSVGFigureSave():boolean {
        return false;
    }

    getReadDataFrom():number|null {
        return this.readDataFromTile;
    }
}

export const init:TileFactory<FreqBarTileConf>  = {

    sanityCheck: (args) => [],

    create: (args) => new FreqBarTile(args)
};