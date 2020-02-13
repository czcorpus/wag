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
import { IActionDispatcher, StatelessModel } from 'kombo';

import { QueryType } from '../../../common/query';
import { TileComponent, TileConf, TileFactory, ITileProvider } from '../../../common/tile';
import { MatchingDocsModel } from './model';
import { init as viewInit } from './view';
import { createMatchingDocsApiInstance } from './apiFactory';



declare var require:(src:string)=>void;  // webpack
require('./style.less');

export interface MatchingDocsTileConf extends TileConf {
    apiURL:string;
    apiType:string;
    corpname?:string; // null can be used in case subqueryMode is enabled
    subcname?:string;
    displayAttrs:string|Array<string>;
    searchAttrs?:string|Array<string>;
    maxNumCategories:number;
    maxNumCategoriesPerPage:number;
}


export class MatchingDocsTile implements ITileProvider {

    private readonly dispatcher:IActionDispatcher;

    private readonly model:MatchingDocsModel;

    private readonly tileId:number;

    private view:TileComponent;

    private readonly label:string;

    private readonly widthFract:number;

    private readonly blockingTiles:Array<number>;

    constructor({dispatcher, tileId, waitForTiles, subqSourceTiles, ut, theme, appServices, widthFract, conf, isBusy, cache, lemmas}:TileFactory.Args<MatchingDocsTileConf>) {
        this.dispatcher = dispatcher;
        this.tileId = tileId;
        this.widthFract = widthFract;
        this.blockingTiles = waitForTiles;

        this.model = new MatchingDocsModel({
            dispatcher: this.dispatcher,
            tileId,
            waitForTiles,
            subqSourceTiles,
            appServices,
            api: createMatchingDocsApiInstance(conf.apiType, conf.apiURL, appServices.getApiHeaders(conf.apiURL), cache),
            initState: {
                isBusy: isBusy,
                isTweakMode: false,
                error: null,
                data: [],
                corpname: conf.corpname,
                subcname: conf.subcname,
                displayAttrs: typeof conf.displayAttrs === 'string' ? [conf.displayAttrs] : [...conf.displayAttrs],
                searchAttrs: conf.searchAttrs ? (typeof conf.searchAttrs === 'string' ? [conf.searchAttrs] : [...conf.searchAttrs]) : null,
                currPage: null,
                numPages: null,
                maxNumCategories: conf.maxNumCategories || 20,
                maxNumCategoriesPerPage: conf.maxNumCategoriesPerPage || 10,
                backlink: null,
                subqSyncPalette: false
            },
            lemmas
        });
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
        this.model.suspend({}, (_, syncData)=>syncData);
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

    exposeModel():StatelessModel<{}>|null {
        return this.model;
    }

    getBlockingTiles():Array<number> {
        return this.blockingTiles;
    }

    supportsNonDictQueries():boolean {
        return false;
    }

    getIssueReportingUrl():null {
        return null;
    }

}

export const TILE_TYPE = 'MatchingDocsTile';

export const init:TileFactory.TileFactory<MatchingDocsTileConf>  = (args) => new MatchingDocsTile(args);