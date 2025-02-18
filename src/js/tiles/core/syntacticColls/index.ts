/*
 * Copyright 2023 Martin Zimandl <martin.zimandl@gmail.com>
 * Copyright 2023 Institute of the Czech National Corpus,
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
import { IAppServices } from '../../../appServices.js';
import { QueryType } from '../../../query/index.js';
import { SyntacticCollsModel } from './model.js';
import { init as viewInit } from './views.js';
import { TileConf, ITileProvider, TileComponent, TileFactory, TileFactoryArgs, ITileReloader, AltViewIconProps } from '../../../page/tile.js';
import { findCurrQueryMatch } from '../../../models/query.js';
import { createInstance } from '../../../api/factory/syntacticColls.js';
import { SCollsQueryTypeValue } from '../../../api/vendor/mquery/syntacticColls.js';


export interface SyntacticCollsTileConf extends TileConf {
    apiURL:string;
    apiType:string;
    corpname:string;
    maxItems:number;
    displayTypes:Array<SCollsQueryTypeValue>;
}

/**
 *
 */
export class SyntacticCollsTile implements ITileProvider {

    private readonly tileId:number;

    private readonly dispatcher:IActionDispatcher;

    private readonly appServices:IAppServices;

    private readonly model:SyntacticCollsModel;

    private readonly widthFract:number;

    private readonly label:string;

    private readonly blockingTiles:Array<number>;

    private view:TileComponent;

    constructor({
        tileId, dispatcher, appServices, ut, theme, waitForTiles,
        waitForTilesTimeoutSecs, widthFract, conf, isBusy,
        queryMatches, cache, queryType
    }:TileFactoryArgs<SyntacticCollsTileConf>) {
        this.tileId = tileId;
        this.dispatcher = dispatcher;
        this.appServices = appServices;
        this.widthFract = widthFract;
        this.blockingTiles = waitForTiles;
        const [api, eApi] = createInstance(conf.apiType, conf.apiURL, appServices, cache, {});
        this.model = new SyntacticCollsModel({
            dispatcher: dispatcher,
            tileId: tileId,
            waitForTile: waitForTiles.length > 0 ? waitForTiles[0] : -1,
            waitForTilesTimeoutSecs: waitForTilesTimeoutSecs,
            appServices: appServices,
            backlink: conf.backlink || null,
            queryType: queryType,
            maxItems: conf.maxItems,
            api,
            eApi,
            initState: {
                isBusy: isBusy,
                isMobile: appServices.isMobileMode(),
                isAltViewMode: false,
                tileId: tileId,
                widthFract: widthFract,
                error: null,
                corpname: conf.corpname,
                queryMatch: findCurrQueryMatch(queryMatches[0]),
                data: {},
                displayTypes: conf.displayTypes,
                examplesCache: {},
                exampleWindowData: undefined
            }
        });
        this.label = appServices.importExternalMessage(conf.label || 'syntactic_colls__main_label');
        this.view = viewInit(
            this.dispatcher,
            ut,
            theme,
            this.model
        );
    }

    getIdent():number {
        return this.tileId;
    }

    getLabel():string {
        return this.label;
    }

    getView():TileComponent {
        return this.view;
    }

    getSourceInfoComponent():null {
        return null;
    }

    supportsQueryType(qt:QueryType, domain1:string, domain2?:string):boolean {
        return qt === QueryType.SINGLE_QUERY;
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
        return {
            baseImg: 'wcloud-view.svg',
            highlightedImg: 'wcloud-view_s.svg',
            inlineCss: {width: '2.2em'}
        };
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

export const init:TileFactory<SyntacticCollsTileConf> = {
    sanityCheck: (args) => [],
    create: (args) => new SyntacticCollsTile(args)
};
