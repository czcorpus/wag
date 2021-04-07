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
import { List } from 'cnc-tskit';
import { TileConf, ITileProvider, TileFactory, TileComponent } from '../../../page/tile';
import { WordSimModel } from './model';
import { IAppServices } from '../../../appServices';
import { init as viewInit } from './view';
import { QueryType } from '../../../query/index';
import { OperationMode } from '../../../models/tiles/wordSim';
import { IWordSimApi } from '../../../api/abstract/wordSim';
import { findCurrQueryMatch } from '../../../models/query';
import { createApiInstance } from '../../../api/factory/wordSim';


export interface WordSimTileConf extends TileConf {
    apiURL:string;
    apiType:string;
    maxResultItems:number;
    minMatchFreq:number;
    minScore?:number;
    corpname?:string;
    model?:string;
}


/**
 *
 */
export class WordSimTile implements ITileProvider {

    private readonly tileId:number;

    private readonly dispatcher:IActionDispatcher;

    private readonly model:WordSimModel;

    private readonly appServices:IAppServices;

    private readonly view:TileComponent;

    private readonly srcInfoView:React.SFC;

    private readonly blockingTiles:Array<number>;

    private readonly label:string;

    private readonly widthFract:number;

    private readonly api:IWordSimApi<{}>;

    constructor({tileId, waitForTiles, dispatcher, appServices, ut, widthFract, conf, theme,
            isBusy, cache, queryMatches, domain1}:TileFactory.Args<WordSimTileConf>) {
        this.tileId = tileId;
        this.dispatcher = dispatcher;
        this.appServices = appServices;
        this.blockingTiles = waitForTiles;
        this.widthFract = widthFract;
        this.label = appServices.importExternalMessage(conf.label || 'wordsim__main_label');
        this.api = createApiInstance(conf.apiType, conf.apiURL, conf.srcInfoURL, appServices, cache);
        this.model = new WordSimModel({
            appServices,
            dispatcher,
            initState: {
                isBusy: isBusy,
                isMobile: appServices.isMobileMode(),
                isAltViewMode: false,
                error: null,
                isTweakMode: false,
                data: List.repeat(_ => [], queryMatches.length),
                maxResultItems: conf.maxResultItems,
                operationMode: OperationMode.MeansLike,
                corpus: conf.corpname || '',
                model: conf.model || '',
                minScore: conf.minScore || 0,
                minMatchFreq: conf.minMatchFreq,
                queryMatches: List.map(lemma => findCurrQueryMatch(lemma), queryMatches),
                selectedText: null
            },
            tileId,
            api: this.api,
            queryDomain: domain1
        });
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

    getSourceInfoComponent():React.SFC {
        return this.srcInfoView;
    }

    supportsQueryType(qt:QueryType, domain1:string, domain2?:string):boolean {
        return qt === QueryType.SINGLE_QUERY || qt === QueryType.CMP_QUERY;
    }

    disable():void {
        this.model.suspend({}, (_, syncData)=>syncData);
    }

    getWidthFract():number {
        return this.widthFract;
    }

    supportsTweakMode():boolean {
        return this.api.supportsTweaking();
    }

    supportsAltView():boolean {
        return true;
    }

    exposeModel():StatelessModel<{}>|null {
        return this.model;
    }

    getBlockingTiles():Array<number> {
        return this.blockingTiles;
    }

    supportsMultiWordQueries():boolean {
        return this.api.supportsMultiWordQueries();
    }

    getIssueReportingUrl():null {
        return null;
    }
}

export const init:TileFactory.TileFactory<WordSimTileConf> = {

    sanityCheck: (args) => [],

    create: (args) => new WordSimTile(args)
};