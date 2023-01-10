/*
 * Copyright 2019 Tomas Machalek <tomas.machalek@gmail.com>
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
import { IAppServices } from '../../../appServices';
import { QueryType } from '../../../query/index';
import { ITileProvider, TileComponent, TileConf, TileFactory } from '../../../page/tile';
import { SearchPackages } from '../../../api/vendor/treq';
import { TranslationsModel } from './model';
import { init as viewInit } from './view';
import { StatelessModel } from 'kombo';
import { createInstance as createApiInstance } from '../../../api/factory/translations';
import { korpusApiAuthActionFactory, TileServerActionFactory } from '../../../server/tileActions';

declare var require:any;
require('./style.less');

export interface TranslationsTileConf extends TileConf {
    apiURL:string;
    apiType:string;
    srchPackages:SearchPackages;
    maxNumLines?:number;
    minItemFreq?:number;
}

/**
 *
 */
export class TranslationsTile implements ITileProvider {

    private readonly tileId:number;

    private readonly appServices:IAppServices;

    private readonly model:TranslationsModel;

    private readonly view:TileComponent;

    private readonly widthFract:number;

    private readonly label:string;

    private static readonly DEFAULT_MAX_NUM_LINES = 10;

    private static readonly DEFAULT_MIN_ITEM_FREQ = 1;

    constructor({tileId, dispatcher, appServices, ut, theme, domain1, domain2, queryMatches, widthFract, conf, isBusy, cache}:TileFactory.Args<TranslationsTileConf>) {
        this.tileId = tileId;
        this.appServices = appServices;
        this.widthFract = widthFract;
        const apiOptions = {authenticateURL: appServices.createActionUrl("/TranslationsTile/authenticate")};
        this.model = new TranslationsModel({
            dispatcher,
            appServices,
            initialState: {
                isBusy: isBusy,
                isAltViewMode: false,
                error: null,
                searchPackages: (conf.srchPackages[domain2] || []),
                translations: [],
                backLink: null,
                maxNumLines: conf.maxNumLines || TranslationsTile.DEFAULT_MAX_NUM_LINES,
                minItemFreq: conf.minItemFreq || TranslationsTile.DEFAULT_MIN_ITEM_FREQ,
                domain1: domain1,
                domain2: domain2
            },
            tileId,
            api: createApiInstance(conf.apiType, conf.apiURL, appServices, cache, apiOptions),
            backlink: conf.backlink || null,
            queryMatches,
            scaleColorGen: theme.scaleColorIndexed
        });
        this.label = appServices.importExternalMessage(conf.label || 'treq__main_label');
        this.view = viewInit(dispatcher, ut, theme, this.model);
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
        return qt === QueryType.TRANSLAT_QUERY;
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

    exposeModel():StatelessModel<{}>|null {
        return this.model;
    }

    getBlockingTiles():Array<number> {
        return [];
    }

    supportsMultiWordQueries():boolean {
        return true;
    }

    getIssueReportingUrl():null {
        return null;
    }
}

export const init:TileFactory.TileFactory<TranslationsTileConf> = {

    sanityCheck: (args) => [],

    create: (args) => new TranslationsTile(args)
};

export const serverActions:() => Array<TileServerActionFactory> = () => [
    korpusApiAuthActionFactory,
];