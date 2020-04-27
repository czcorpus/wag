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
import { IAppServices } from '../../../appServices';
import { CorePosAttribute } from '../../../common/types';
import { QueryType } from '../../../common/query';
import { CollocMetric } from './common';
import { CollocModel } from './model';
import { init as viewInit } from './views';
import { TileConf, ITileProvider, TileComponent, TileFactory, Backlink } from '../../../common/tile';
import { CollocationApi, SrchContextType } from '../../../common/api/abstract/collocations';
import { createInstance } from '../../../common/api/factory/collocations';
import { createApiInstance } from '../../../common/api/factory/concordance';
import { findCurrQueryMatch } from '../../../models/query';


declare var require:(src:string)=>void;  // webpack
require('./style.less');


export interface CollocationsTileConf extends TileConf {
    apiURL:string;
    apiType:string;
    corpname:string;
    minFreq:number;
    minLocalFreq:number;
    rangeSize:number;
    maxItems?:number;
    backlink?:Backlink;

    /**
     * A positional attribute name and a function to create a query value (e.g. ['tag', (v) => `${v}.+`]).
     * In case waitForTile is not filled in then this must be present.
     */
    posQueryGenerator?:[string, string];
}

/**
 *
 */
export class CollocationsTile implements ITileProvider {

    private readonly tileId:number;

    private readonly dispatcher:IActionDispatcher;

    private readonly appServices:IAppServices;

    private readonly model:CollocModel;

    private readonly widthFract:number;

    private readonly label:string;

    private readonly blockingTiles:Array<number>;

    private view:TileComponent;

    private readonly api:CollocationApi<{}>;

    constructor({tileId, dispatcher, appServices, ut, theme, waitForTiles, waitForTilesTimeoutSecs, widthFract, conf, isBusy, queryMatches, cache, queryType}:TileFactory.Args<CollocationsTileConf>) {
        this.tileId = tileId;
        this.dispatcher = dispatcher;
        this.appServices = appServices;
        this.widthFract = widthFract;
        this.blockingTiles = waitForTiles;
        this.api = createInstance(conf.apiType, conf.apiURL, appServices.getApiHeaders(conf.apiURL), cache);
        if (waitForTiles.length > 1) {
            console.warn(`The collocation tile does support waiting for 0-1 other tiles`);
        }
        if (waitForTiles.length === 0 && !conf.posQueryGenerator) {
            throw new Error(`The collocation tile requires either waitFor or posQueryGenerator configured`);
        }
        this.model = new CollocModel({
            dispatcher: dispatcher,
            tileId: tileId,
            waitForTile: waitForTiles.length > 0 ? waitForTiles[0] : -1,
            waitForTilesTimeoutSecs: waitForTilesTimeoutSecs,
            appServices: appServices,
            service: this.api,
            concApi: createApiInstance(cache, conf.apiType, conf.apiURL, appServices.getApiHeaders(conf.apiURL)),
            backlink: conf.backlink || null,
            queryType: queryType,
            apiType: conf.apiType,
            initState: {
                isBusy: isBusy,
                isTweakMode: false,
                isAltViewMode: false,
                tileId: tileId,
                widthFract: widthFract,
                error: null,
                corpname: conf.corpname,
                concIds: List.map(_ => null, queryMatches),
                selectedText: null,
                tokenAttr: CorePosAttribute.LEMMA,
                srchRange: conf.rangeSize,
                srchRangeType: SrchContextType.BOTH,
                minAbsFreq: conf.minFreq,
                minLocalAbsFreq: conf.minLocalFreq,
                appliedMetrics: [CollocMetric.LOG_DICE, CollocMetric.MI, CollocMetric.T_SCORE],
                sortByMetric: CollocMetric.LOG_DICE,
                data: List.map(_ => null, queryMatches),
                heading: [],
                citemsperpage: conf.maxItems ? conf.maxItems : 10,
                backlink: null,
                queryMatches: List.map(findCurrQueryMatch, queryMatches),
                posQueryGenerator: conf.posQueryGenerator
            }
        });
        this.label = appServices.importExternalMessage(conf.label || 'collocations__main_label');
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

    supportsQueryType(qt:QueryType, lang1:string, lang2?:string):boolean {
        return qt === QueryType.SINGLE_QUERY || qt === QueryType.CMP_QUERY || qt === QueryType.TRANSLAT_QUERY;
    }

    disable():void {
        this.model.suspend({}, (_, syncData)=>syncData);
    }

    getWidthFract():number {
        return this.widthFract;
    }

    supportsTweakMode():boolean {
        return this.api.supportsLeftRightContext();
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

export const init:TileFactory.TileFactory<CollocationsTileConf> = (args) => new CollocationsTile(args);