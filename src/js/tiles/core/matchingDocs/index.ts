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
import { IActionDispatcher } from 'kombo';

import { QueryType } from '../../../query/index.js';
import { TileComponent, TileConf, TileFactory, ITileProvider, TileFactoryArgs, DEFAULT_ALT_VIEW_ICON, ITileReloader, AltViewIconProps } from '../../../page/tile.js';
import { MatchingDocsModel } from './model.js';
import { init as viewInit } from './view.js';
import { createMatchingDocsApiInstance } from '../../../api/factory/matchingDocs.js';
import { List } from 'cnc-tskit';
import { CoreApiGroup } from '../../../api/coreGroups.js';


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
    linkTemplate?:string;
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

    constructor({
        dispatcher, tileId, waitForTiles, waitForTilesTimeoutSecs, subqSourceTiles, ut,
        theme, appServices, widthFract, conf, isBusy, cache, queryMatches
    }:TileFactoryArgs<MatchingDocsTileConf>) {

        this.dispatcher = dispatcher;
        this.tileId = tileId;
        this.widthFract = widthFract;
        this.blockingTiles = waitForTiles;
        const apiOptions = conf.apiType === CoreApiGroup.KONTEXT_API ?
            {authenticateURL: appServices.createActionUrl("/MatchingDocsTile/authenticate")} :
            {};

        this.model = new MatchingDocsModel({
            dispatcher: this.dispatcher,
            tileId,
            waitForTiles,
            waitForTilesTimeoutSecs,
            subqSourceTiles,
            appServices,
            api: createMatchingDocsApiInstance(conf.apiType, conf.apiURL, appServices, cache, apiOptions),
            initState: {
                isBusy: isBusy,
                isTweakMode: false,
                error: null,
                data: [],
                corpname: conf.corpname,
                subcname: conf.subcname,
                minFreq: conf.minFreq || 1,
                displayAttrs: typeof conf.displayAttrs === 'string' ?
                    [conf.displayAttrs] :
                    [...conf.displayAttrs],
                searchAttrs: getSearchAttrs(conf),
                heading: typeof conf.displayAttrs === 'string' ?
                    [appServices.translateResourceMetadata(conf.corpname, conf.displayAttrs)] :
                    List.map(v => appServices.translateResourceMetadata(conf.corpname, v), conf.displayAttrs),
                currPage: null,
                numPages: null,
                maxNumCategories: conf.maxNumCategories || 20,
                maxNumCategoriesPerPage: conf.maxNumCategoriesPerPage || 10,
                backlink: null,
                subqSyncPalette: false,
                linkTemplate: conf.linkTemplate,
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
        this.model.waitForAction({}, (_, syncData)=>syncData);
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
        return false;
    }

    getIssueReportingUrl():null {
        return null;
    }
}

export const init:TileFactory<MatchingDocsTileConf>  = {

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
