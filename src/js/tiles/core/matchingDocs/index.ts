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

import { QueryType } from '../../../query/index';
import { TileComponent, TileConf, TileFactory, ITileProvider } from '../../../page/tile';
import { MatchingDocsModel } from './model';
import { init as viewInit } from './view';
import { createMatchingDocsApiInstance } from '../../../api/factory/matchingDocs';
import { List } from 'cnc-tskit';
import { kontextApiAuthActionFactory, TileServerActionFactory } from '../../../server/tileActions';



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
    minFreq?:number;
}

function getSearchAttrs(conf:MatchingDocsTileConf):Array<string> {
    if (Array.isArray(conf.searchAttrs)) {
        return conf.searchAttrs;
    }
    if (conf.searchAttrs) {
        return [conf.searchAttrs];
    }
    if (Array.isArray(conf.displayAttrs)) {
        return conf.displayAttrs;
    }
    return [conf.displayAttrs];
}


export class MatchingDocsTile implements ITileProvider {

    private readonly dispatcher:IActionDispatcher;

    private readonly model:MatchingDocsModel;

    private readonly tileId:number;

    private view:TileComponent;

    private readonly label:string;

    private readonly widthFract:number;

    private readonly blockingTiles:Array<number>;

    constructor({dispatcher, tileId, waitForTiles, waitForTilesTimeoutSecs, subqSourceTiles, ut, theme, appServices,
            widthFract, conf, isBusy, cache, queryMatches}:TileFactory.Args<MatchingDocsTileConf>) {
        this.dispatcher = dispatcher;
        this.tileId = tileId;
        this.widthFract = widthFract;
        this.blockingTiles = waitForTiles;
        const apiOptions = conf.apiType === "kontextApi" ?
            {authenticateURL: appServices.createActionUrl("/MatchingDocsTile/authenticate")} :
            {};

        this.model = new MatchingDocsModel({
            dispatcher: this.dispatcher,
            tileId,
            waitForTiles,
            waitForTilesTimeoutSecs,
            subqSourceTiles,
            appServices,
            api: createMatchingDocsApiInstance(conf.apiType, conf.apiURL, appServices, appServices.getApiHeaders(conf.apiURL), cache, apiOptions),
            initState: {
                isBusy: isBusy,
                isTweakMode: false,
                error: null,
                data: [],
                corpname: conf.corpname,
                subcname: conf.subcname,
                minFreq: conf.minFreq || 1,
                displayAttrs: typeof conf.displayAttrs === 'string' ? [conf.displayAttrs] : [...conf.displayAttrs],
                searchAttrs: getSearchAttrs(conf),
                currPage: null,
                numPages: null,
                maxNumCategories: conf.maxNumCategories || 20,
                maxNumCategoriesPerPage: conf.maxNumCategoriesPerPage || 10,
                backlink: null,
                subqSyncPalette: false
            },
            queryMatches
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

    supportsQueryType(qt:QueryType, domain1:string, domain2?:string):boolean {
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

    supportsMultiWordQueries():boolean {
        return false;
    }

    getIssueReportingUrl():null {
        return null;
    }

}

export const init:TileFactory.TileFactory<MatchingDocsTileConf>  = {

    sanityCheck: (args) => {
        const ans = [];
        const dattrs = Array.isArray(args.conf.displayAttrs) ?
                args.conf.displayAttrs : [args.conf.displayAttrs];
        const sattrs = Array.isArray(args.conf.searchAttrs) ?
                args.conf.searchAttrs : [args.conf.searchAttrs];
        if (List.some(x => /[^\s]+ \d+/.exec(x) !== null, dattrs)
                || List.some(x => /[^\s]+ \d+/.exec(x) !== null, sattrs)) {
            ans.push(new Error('Display and search attributes should be simple attribute names.'));
        }
        return ans;
    },

    create: (args) => new MatchingDocsTile(args)
};

export const serverActions:() => Array<TileServerActionFactory> = () => [
    kontextApiAuthActionFactory,
];