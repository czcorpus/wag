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
import { LocalizedConfMsg } from '../../../types';
import { QueryType } from '../../../query/index';
import { TileComponent, TileConf, TileFactory, Backlink, ITileProvider } from '../../../page/tile';
import { GlobalComponents } from '../../../views/global';
import { factory as defaultModelFactory, FreqComparisonModel } from './model';
import { init as viewInit } from './view';
import { FreqSort } from '../../../api/vendor/kontext/freqs';
import { createMultiBlockApiInstance as createFreqsApiInstance } from '../../../api/factory/freqs';
import { createApiInstance as createConcApiInstance } from '../../../api/factory/concordance';
import { kontextApiAuthActionFactory, TileServerActionFactory } from '../../../server/tileActions';
import { CoreApiGroup } from '../../../api/coreGroups';



declare var require:(src:string)=>void;  // webpack
require('./style.less');

export interface FreqComparisonTileConf extends TileConf {
    apiURL:string;
    apiType:string;
    corpname:string;
    fcrit:string|Array<string>;
    critLabels:LocalizedConfMsg|Array<LocalizedConfMsg>;
    flimit:number;
    freqSort:FreqSort;
    fpage:number;
    fttIncludeEmpty:boolean;
    posQueryGenerator:[string, string];
    maxChartsPerLine?:number;
    backlink?:Backlink;
}


export class FreqComparisonTile implements ITileProvider {

    private readonly dispatcher:IActionDispatcher;

    private readonly ut:ViewUtils<GlobalComponents>;

    private readonly model:FreqComparisonModel;

    private readonly tileId:number;

    private view:TileComponent;

    private readonly label:string;

    private readonly widthFract:number;

    private readonly appServices:IAppServices;

    private readonly blockingTiles:Array<number>;

    constructor({dispatcher, tileId, waitForTiles, waitForTilesTimeoutSecs, ut, theme, appServices, widthFract,
            conf, isBusy, cache, queryMatches}:TileFactory.Args<FreqComparisonTileConf>) {
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
            {authenticateURL: appServices.createActionUrl("/FreqComparisonTile/authenticate")} :
            {};

        this.model = defaultModelFactory(
            this.dispatcher,
            tileId,
            waitForTiles,
            waitForTilesTimeoutSecs,
            appServices,
            createConcApiInstance(cache, conf.apiType, conf.apiURL, appServices, apiOptions),
            createFreqsApiInstance(cache, conf.apiType, conf.apiURL, appServices, apiOptions),
            conf.backlink || null,
            {
                isBusy: isBusy,
                error: null,
                blocks: List.map(
                    v => ({
                        data: [],
                        words: List.map(_ => null, queryMatches),
                        ident: Ident.puid(),
                        isReady: false,
                        label: null
                    }),
                    criteria
                ),
                activeBlock: 0,
                corpname: conf.corpname,
                fcrit: criteria,
                critLabels: labels,
                flimit: conf.flimit,
                freqSort: conf.freqSort,
                fpage: conf.fpage,
                fttIncludeEmpty: conf.fttIncludeEmpty,
                fmaxitems: 100,
                backlink: null,
                maxChartsPerLine: conf.maxChartsPerLine ? conf.maxChartsPerLine : 3,
                isAltViewMode: false,
                posQueryGenerator: conf.posQueryGenerator
            },
            queryMatches
        );
        this.label = appServices.importExternalMessage(conf.label || 'freq_comparison__main_label');
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
        this.model.suspend({}, (_, syncData)=>syncData);
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

    exposeModelForRetryOnError():StatelessModel<{}>|null {
        return this.model;
    }

    getBlockingTiles():Array<number> {
        return this.blockingTiles;
    }

    supportsMultiWordQueries():boolean {
        return true;
    }

    exposeModel():StatelessModel<{}>|null {
        return this.model;
    }

    getIssueReportingUrl():null {
        return null;
    }
}

export const init:TileFactory.TileFactory<FreqComparisonTileConf>  = {

    sanityCheck: (args) => {
        const ans = [];
        if (!args.conf.posQueryGenerator) {
            ans.push(new Error('FreqComparisonTile must have posQueryGenerator configured'));
        }
        return ans;
    },
    create: (args) => new FreqComparisonTile(args)
};

export const serverActions:() => Array<TileServerActionFactory> = () => [
    kontextApiAuthActionFactory,
];