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
import { IActionDispatcher, ViewUtils, StatelessModel } from 'kombo';

import { AppServices } from '../../../appServices';
import { SubqueryModeConf } from '../../../common/models/freq';
import { QueryType } from '../../../common/query';
import { TileComponent, TileConf, TileFactory, ITileProvider } from '../../../common/tile';
import { GlobalComponents } from '../../../views/global';
import { factory as defaultModelFactory, MatchingDocsModel } from './model';
import { init as viewInit } from './view';
import { createMatchingDocsApiInstance } from './apiFactory';
import { DataRow } from '../../../common/api/abstract/matchingDocs';



declare var require:(src:string)=>void;  // webpack
require('./style.less');

export interface MatchingDocsTileConf extends TileConf {
    apiURL:string;
    apiType:string;
    corpname:string|null; // null can be used in case subqueryMode is enabled
    subcname:string|null;
    displayAttrs:string|Array<string>;
    srchAttrs?:string|Array<string>;
    maxNumCategories:number;
    maxNumCategoriesPerPage:number;

    // if defined, then we wait for some other
    // tile which produces payload extended
    // from SubqueryPayload. This tile will
    // perform provided subqueries, and
    // obtains respective freq. distributions.
    subqueryMode?:SubqueryModeConf;
}


export class MatchingDocsTile implements ITileProvider {

    private readonly dispatcher:IActionDispatcher;

    private readonly ut:ViewUtils<GlobalComponents>;

    private readonly model:MatchingDocsModel;

    private readonly tileId:number;

    private view:TileComponent;

    private readonly label:string;

    private readonly widthFract:number;

    private readonly appServices:AppServices;

    private readonly blockingTiles:Array<number>;

    constructor({dispatcher, tileId, waitForTiles, subqSourceTiles, ut, theme, appServices, widthFract, conf, isBusy, cache}:TileFactory.Args<MatchingDocsTileConf>) {
        this.dispatcher = dispatcher;
        this.tileId = tileId;
        this.widthFract = widthFract;
        this.appServices = appServices;
        this.blockingTiles = waitForTiles;

        const modelFact = defaultModelFactory;
        this.model = modelFact(
            this.dispatcher,
            tileId,
            waitForTiles,
            subqSourceTiles,
            appServices,
            createMatchingDocsApiInstance(conf.apiType, conf.apiURL, appServices.getApiHeaders(conf.apiURL), cache),
            {
                isBusy: isBusy,
                isTweakMode: false,
                error: null,
                data: Immutable.List<DataRow>(),
                corpname: conf.corpname,
                subcname: conf.subcname,
                concId: null,
                displayAttrs: Immutable.List<string>(typeof conf.displayAttrs === 'string' ? [conf.displayAttrs] : conf.displayAttrs),
                srchAttrs: conf.srchAttrs ? Immutable.List<string>(typeof conf.srchAttrs === 'string' ? [conf.srchAttrs] : conf.srchAttrs) : null,
                currPage: null,
                numPages: null,
                maxNumCategories: conf.maxNumCategories,
                maxNumCategoriesPerPage: conf.maxNumCategoriesPerPage,
                backlink: null,
                subqSyncPalette: false
            }
        );
        this.label = appServices.importExternalMessage(conf.label || 'matchingDocs__main_label');
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

export const TILE_TYPE = 'MatchingDocsTile';

export const init:TileFactory.TileFactory<MatchingDocsTileConf>  = (args) => new MatchingDocsTile(args);