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
import { IActionDispatcher, StatelessModel } from 'kombo';

import { IAppServices } from '../../../appServices';
import { QueryType } from '../../../query/index';
import { TileConf, ITileProvider, TileFactory, TileComponent, TileFactoryArgs } from '../../../page/tile';
import { ConcFilterModel } from './model';
import { init as viewInit } from './view';
import { ViewMode } from '../../../api/abstract/concordance';
import { LocalizedConfMsg } from '../../../types';
import { TileWait } from '../../../models/tileSync';
import { List } from 'cnc-tskit';
import { createKontextConcApiInstance } from '../../../api/factory/concordance';



export interface ConcFilterTileConf extends TileConf {
    apiType:string;
    apiURL:string;
    switchMainCorpApiURL?:string;
    corpname:string;
    parallelLangMapping?:{[lang:string]:string};
    posAttrs:Array<string>;
    metadataAttrs?:Array<{value:string; label:LocalizedConfMsg}>;
}

/**
 *
 */
export class ConcFilterTile implements ITileProvider {

    private readonly tileId:number;

    private readonly dispatcher:IActionDispatcher;

    private readonly model:ConcFilterModel;

    private readonly appServices:IAppServices;

    private view:TileComponent;

    private readonly widthFract:number;

    private readonly label:string;

    private readonly blockingTiles:Array<number>;

    constructor({
        tileId, waitForTiles, waitForTilesTimeoutSecs, subqSourceTiles,
        dispatcher, appServices, ut, widthFract, conf, theme, isBusy, cache,
        domain2, queryMatches
    }:TileFactoryArgs<ConcFilterTileConf>) {

        this.tileId = tileId;
        this.dispatcher = dispatcher;
        this.widthFract = widthFract;
        this.appServices = appServices;
        this.blockingTiles = waitForTiles;
        this.model = new ConcFilterModel({
            queryMatches,
            dispatcher,
            tileId,
            waitForTiles,
            waitForTilesTimeoutSecs,
            subqSourceTiles,
            appServices,
            api: createKontextConcApiInstance(cache, conf.apiType, conf.apiURL, appServices, appServices.createActionUrl("/ConcFilterTile/authenticate")),
            initState: {
                isBusy: isBusy,
                error: null,
                isTweakMode: false,
                isMobile: appServices.isMobileMode(),
                widthFract: widthFract,
                corpName: conf.corpname,
                otherCorpname: conf.parallelLangMapping ? conf.parallelLangMapping[domain2] : null,
                posAttrs: conf.posAttrs,
                lines: [],
                concPersistenceId: null,
                viewMode: ViewMode.SENT,
                attrVmode: 'mouseover',
                itemsPerSrc: 1,
                visibleMetadataLine: -1,
                metadataAttrs: (conf.metadataAttrs || []).map(v => ({value: v.value, label: appServices.importExternalMessage(v.label)})),
                backlink: null,
            },
            backlink: conf.backlink || null,
        });
        this.label = appServices.importExternalMessage(conf.label || 'collexamples__main_label');
        this.view = viewInit(this.dispatcher, ut, theme, this.model);
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
        return qt === QueryType.SINGLE_QUERY || qt === QueryType.TRANSLAT_QUERY;
    }

    disable():void {
        this.model.suspend(TileWait.create([], ()=>false), (_, syncData)=>syncData);
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

    exposeModel():StatelessModel<{}>|null {
        return this.model;
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

export const init:TileFactory<ConcFilterTileConf> = {

    sanityCheck: (args) => {
        const ans:Array<Error> = [];
        if (List.empty(args.waitForTiles) || List.empty(args.subqSourceTiles)) {
            throw new Error('ConcFilterTile needs both waitFor (concordance) and readSubqFrom (list of words to filter by) configured');
        }
        return ans;
    },
    create: (args) => new ConcFilterTile(args)
};
