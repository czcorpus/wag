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
import { TileConf, ITileProvider, TileFactory, TileComponent } from '../../../common/tile';
import { WordSimModel } from './model';
import { IAppServices } from '../../../appServices';
import { init as viewInit } from './view';
import { QueryType } from '../../../common/query';
import { createWordSimApiInstance } from './apiFactory';
import { OperationMode } from '../../../common/models/wordSim';
import { WordSimApi } from '../../../common/api/abstract/wordSim';
import { findCurrQueryMatch } from '../../../models/query';


declare var require:(src:string)=>void;  // webpack
require('./style.less');


export interface WordSimTileConf extends TileConf {
    apiURL:string;
    apiType:string;
    maxResultItems:number;
    minScore?:number;
    corpname?:string;
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

    private readonly api:WordSimApi<{}>;

    constructor({tileId, waitForTiles, dispatcher, appServices, ut, widthFract, conf, theme,
            isBusy, cache, queryMatches}:TileFactory.Args<WordSimTileConf>) {
        this.tileId = tileId;
        this.dispatcher = dispatcher;
        this.appServices = appServices;
        this.blockingTiles = waitForTiles;
        this.widthFract = widthFract;
        this.label = appServices.importExternalMessage(conf.label || 'wordsim__main_label');
        this.api = createWordSimApiInstance(conf.apiType, conf.apiURL, conf.srcInfoURL, appServices.getApiHeaders(conf.apiURL), cache);
        this.model = new WordSimModel({
            dispatcher,
            initState: {
                isBusy: isBusy,
                isMobile: appServices.isMobileMode(),
                isAltViewMode: false,
                error: null,
                isTweakMode: false,
                data: List.map(_ => null, queryMatches),
                maxResultItems: conf.maxResultItems,
                operationMode: OperationMode.MeansLike,
                corpus: conf.corpname || '',
                minScore: conf.minScore || 0,
                queryMatches: List.map(lemma => findCurrQueryMatch(lemma), queryMatches),
                selectedText: null
            },
            tileId,
            api: this.api
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

    supportsQueryType(qt:QueryType, lang1:string, lang2?:string):boolean {
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
        return true;
    }

    getIssueReportingUrl():null {
        return null;
    }
}

export const TILE_TYPE = 'WordSimTile';

export const init:TileFactory.TileFactory<WordSimTileConf> = (args) => new WordSimTile(args);