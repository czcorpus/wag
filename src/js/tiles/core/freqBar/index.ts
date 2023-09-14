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
import { IActionDispatcher, ViewUtils, StatelessModel } from 'kombo';
import { Ident, List } from 'cnc-tskit';

import { IAppServices } from '../../../appServices';
import { FreqSort } from '../../../api/vendor/kontext/freqs';
import { SubqueryModeConf } from '../../../models/tiles/freq';
import { LocalizedConfMsg } from '../../../types';
import { QueryType } from '../../../query/index';
import { TileComponent, TileConf, TileFactory, ITileProvider, TileFactoryArgs, DEFAULT_ALT_VIEW_ICON, ITileReloader, AltViewIconProps } from '../../../page/tile';
import { GlobalComponents } from '../../../views/common';
import { factory as defaultModelFactory, FreqBarModel } from './model';
import { factory as subqModelFactory } from './subqModel';
import { init as viewInit } from './view';
import { createMultiBlockApiInstance } from '../../../api/factory/freqs';
import { CoreApiGroup } from '../../../api/coreGroups';
import { createKontextConcApiInstance } from '../../../api/factory/concordance';


export interface FreqBarTileConf extends TileConf {
    apiURL:string;
    apiType:string;
    corpname:string|null; // null can be used in case subqueryMode is enabled
    fcrit:string|Array<string>;
    freqType:'tokens'|'text-types';
    critLabels:LocalizedConfMsg|Array<LocalizedConfMsg>;
    flimit:number;
    freqSort:FreqSort;
    fpage:number;
    fttIncludeEmpty:boolean;
    maxNumCategories:number;

    // if defined, then we wait for some other
    // tile which produces payload extended
    // from SubqueryPayload. This tile will
    // perform provided subqueries, and
    // obtains respective freq. distributions.
    subqueryMode?:SubqueryModeConf;
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

    constructor({
        dispatcher, tileId, waitForTiles, waitForTilesTimeoutSecs, subqSourceTiles,
        ut, theme, appServices, widthFract, conf, isBusy, cache
    }:TileFactoryArgs<FreqBarTileConf>) {

        this.dispatcher = dispatcher;
        this.tileId = tileId;
        this.widthFract = widthFract;
        this.appServices = appServices;
        this.blockingTiles = waitForTiles;
        this.label = appServices.importExternalMessage(conf.label);
        const criteria = typeof conf.fcrit === 'string' ? [conf.fcrit] : conf.fcrit;
        const labels = Array.isArray(conf.critLabels) ?
            conf.critLabels.map(v => this.appServices.importExternalMessage(v)) :
            [this.appServices.importExternalMessage(conf.critLabels)];
        const apiOptions = conf.apiType === CoreApiGroup.KONTEXT_API ?
            {authenticateURL: appServices.createActionUrl("/FreqBarTile/authenticate")} :
            {};
        const modelFact = conf.subqueryMode ?
                subqModelFactory(
                    conf.subqueryMode,
                    createKontextConcApiInstance(cache, conf.apiType, conf.apiURL, appServices, apiOptions)
                ) :
                defaultModelFactory;
        this.model = modelFact(
            this.dispatcher,
            tileId,
            waitForTiles,
            waitForTilesTimeoutSecs,
            subqSourceTiles,
            appServices,
            createMultiBlockApiInstance(cache, conf.apiType, conf.apiURL, appServices, apiOptions),
            conf.backlink || null,
            {
                isBusy: isBusy,
                error: null,
                blocks: criteria.map(v => ({
                    data: [],
                    ident: Ident.puid(),
                    isReady: false,
                    label: ''
                })),
                activeBlock: 0,
                corpname: conf.corpname,
                concId: null,
                fcrit: criteria,
                freqType: conf.freqType,
                critLabels: labels,
                flimit: conf.flimit,
                freqSort: conf.freqSort,
                fpage: conf.fpage,
                fttIncludeEmpty: conf.fttIncludeEmpty,
                maxNumCategories: conf.maxNumCategories,
                fmaxitems: 100,
                backlink: null,
                subqSyncPalette: false,
                isAltViewMode: false
            }
        );
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
}

export const init:TileFactory<FreqBarTileConf>  = {

    sanityCheck: (args) => {
        const ans = [];
        if (List.empty(args.waitForTiles)) {
            ans.push(new Error('FreqBarTile needs waitFor configured as it cannot load its own source concordances'));
        }
        return ans;
    },
    create: (args) => new FreqBarTile(args)
};
