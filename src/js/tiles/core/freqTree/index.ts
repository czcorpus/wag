/*
 * Copyright 2019 Martin Zimandl <martin.zimandl@gmail.com>
 * Copyright 2019 Institute of the Czech National Corpus,
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
import { IActionDispatcher, ViewUtils, StatelessModel } from 'kombo';
import { Ident, List } from 'cnc-tskit';

import { IAppServices } from '../../../appServices';
import { FreqTreeAPI } from '../../../api/vendor/kontext/freqTree';
import { FreqTreeDataBlock } from '../../../models/tiles/freqTree';
import { LocalizedConfMsg } from '../../../types';
import { QueryType } from '../../../query/index';
import { TileComponent, TileConf, TileFactory, ITileProvider, TileFactoryArgs, DEFAULT_ALT_VIEW_ICON, ITileReloader, AltViewIconProps } from '../../../page/tile';
import { GlobalComponents } from '../../../views/common';
import { factory as defaultModelFactory, FreqTreeModel } from './model';
import { init as viewInit } from './view';
import { findCurrQueryMatch } from '../../../models/query';
import { createKontextConcApiInstance } from '../../../api/factory/concordance';
import { CoreApiGroup } from '../../../api/coreGroups';
import { createSimpleFreqApiInstance } from '../../../api/factory/freqs';


export interface FreqTreeTileConf extends TileConf {
    apiType:string;
    apiURL:string;
    corpname:string;
    fcritTrees:Array<Array<string>>; // trees of 2 levels
    treeLabels:LocalizedConfMsg|Array<LocalizedConfMsg>;
    flimit:number;
    fpage:number;
    fttIncludeEmpty:boolean;
    maxChartsPerLine?:number;
    posQueryGenerator:[string, string];
}


export class FreqTreeTile implements ITileProvider {

    private readonly dispatcher:IActionDispatcher;

    private readonly ut:ViewUtils<GlobalComponents>;

    private readonly model:FreqTreeModel;

    private readonly tileId:number;

    private view:TileComponent;

    private readonly label:string;

    private readonly widthFract:number;

    private readonly appServices:IAppServices;

    private readonly blockingTiles:Array<number>;

    constructor({
        dispatcher, tileId, waitForTiles, waitForTilesTimeoutSecs, ut, theme, appServices,
        widthFract, conf, isBusy, cache, queryMatches
    }:TileFactoryArgs<FreqTreeTileConf>) {

        this.dispatcher = dispatcher;
        this.tileId = tileId;
        this.widthFract = widthFract;
        this.appServices = appServices;
        this.blockingTiles = waitForTiles;
        this.label = appServices.importExternalMessage(conf.label);
        const labels = Array.isArray(conf.treeLabels) ?
            conf.treeLabels.map(v => this.appServices.importExternalMessage(v)) :
            [this.appServices.importExternalMessage(conf.treeLabels)];

        const apiOptions = conf.apiType === CoreApiGroup.KONTEXT_API ?
            {authenticateURL: appServices.createActionUrl("/FreqTreeTile/authenticate")} :
            {};
        const concApi = createKontextConcApiInstance(cache, conf.apiType, conf.apiURL, appServices, apiOptions);
        const freqApi = createSimpleFreqApiInstance(cache, conf.apiType, conf.apiURL, appServices, apiOptions);

        this.model = defaultModelFactory(
            this.dispatcher,
            tileId,
            waitForTiles,
            waitForTilesTimeoutSecs,
            appServices,
            concApi,
            new FreqTreeAPI(cache, conf.apiURL, appServices, concApi, freqApi),
            conf.backlink || null,
            {
                isBusy: isBusy,
                error: null,
                frequencyTree: conf.fcritTrees.map(_ => ({
                    data: {},
                    ident: Ident.puid(),
                    label: '',
                    isReady: false
                }) as FreqTreeDataBlock),
                activeBlock: 0,
                corpname: conf.corpname,
                fcritTrees: conf.fcritTrees,
                treeLabels: labels,
                flimit: conf.flimit,
                fpage: conf.fpage,
                fttIncludeEmpty: conf.fttIncludeEmpty,
                fmaxitems: 100,
                backlink: null,
                maxChartsPerLine: conf.maxChartsPerLine ? conf.maxChartsPerLine : 3,
                lemmaVariants: List.map(lemma => findCurrQueryMatch(lemma), queryMatches),
                zoomCategory: conf.fcritTrees.map(_ => List.map(_ => null, queryMatches)),
                posQueryGenerator: conf.posQueryGenerator
            }
        );
        this.label = appServices.importExternalMessage(conf.label || 'freqTree__main_label');
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
        return qt === QueryType.CMP_QUERY;
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
        return true;
    }

    getIssueReportingUrl():null {
        return null;
    }
}

export const init:TileFactory<FreqTreeTileConf>  = {

    sanityCheck: (args) => [],
    create: (args) => new FreqTreeTile(args)
};
