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

import { QueryType } from '../../../query/index';
import { Backlink, ITileProvider, TileComponent, TileConf, TileFactory } from '../../../page/tile';
import { GlobalComponents } from '../../../views/global';
import { MergeCorpFreqModel } from './model';
import { init as viewInit } from './view';
import { LocalizedConfMsg } from '../../../types';
import { findCurrQueryMatch } from '../../../models/query';
import { createApiInstance as createConcApiInstance } from '../../../api/factory/concordance';
import { createApiInstance as createFreqApiInstance } from '../../../api/factory/freqs';


declare var require:(src:string)=>void;  // webpack
require('./style.less');


export interface MergeCorpFreqTileConf extends TileConf {
    apiURL:string;
    apiType:string;
    pixelsPerCategory?:number;
    sources:Array<{

        corpname:string;
        corpusSize:number;
        fcrit:string;
        flimit:number;
        freqSort:string;
        fpage:number;
        fttIncludeEmpty:boolean;

        /**
          * In case 'fcrit' describes a positional
          * attribute we have to replace ann actual
          * value returned by freq. distrib. function
          * (which is equal to our query: e.g. for
          * the query 'house' the value will be 'house')
          * by something more specific (e.g. 'social media')
          */
        valuePlaceholder?:LocalizedConfMsg;
        backlink?:Backlink;

        /**
         * If true then the model will always consider possible
         * multiple values as some sub-categorization we are actually
         * not interested in merge all the values into one.
         */
        isSingleCategory?:boolean;
    }>;
}

/**
 * A freq. dist. tile with multiple corpora as sources.
 * It was created mainly to be able to group text types
 * with spoken language as additional "text type" category.
 *
 * The tile's model requires more advanced configuration
 * as it depends typically on more than one other tile.
 */
export class MergeCorpFreqTile implements ITileProvider {

    private readonly dispatcher:IActionDispatcher;

    private readonly ut:ViewUtils<GlobalComponents>;

    private readonly model:MergeCorpFreqModel;

    private readonly tileId:number;

    private view:TileComponent;

    private readonly label:string;

    private readonly widthFract:number;

    private readonly blockingTiles:Array<number>;

    constructor({dispatcher, tileId, waitForTiles, waitForTilesTimeoutSecs, ut,
                theme, appServices, widthFract, conf, isBusy, cache, queryMatches}:TileFactory.Args<MergeCorpFreqTileConf>) {
        this.dispatcher = dispatcher;
        this.tileId = tileId;
        this.widthFract = widthFract;
        this.label = appServices.importExternalMessage(conf.label);
        this.blockingTiles = waitForTiles;
        this.model = new MergeCorpFreqModel({
            dispatcher: this.dispatcher,
            tileId,
            waitForTiles,
            waitForTilesTimeoutSecs,
            appServices,
            concApi: createConcApiInstance(cache, conf.apiType, conf.apiURL, appServices),
            freqApi: createFreqApiInstance(cache, conf.apiType, conf.apiURL, appServices),
            initState: {
                isBusy: isBusy,
                isAltViewMode: false,
                error: null,
                data: [],
                sources: conf.sources.map(src => ({
                    corpname: src.corpname,
                    corpusSize: src.corpusSize,
                    fcrit: src.fcrit,
                    flimit: src.flimit,
                    freqSort: src.freqSort,
                    fpage: src.fpage,
                    fttIncludeEmpty: src.fttIncludeEmpty,
                    valuePlaceholder: src.valuePlaceholder ?
                            appServices.importExternalMessage(src.valuePlaceholder) :
                            null,
                    uuid: Ident.puid(),
                    backlinkTpl: src.backlink || null,
                    backlink: null,
                    isSingleCategory: !!src.isSingleCategory
                })),
                pixelsPerCategory: conf.pixelsPerCategory ? conf.pixelsPerCategory : 30,
                queryMatches: List.map(lemma => findCurrQueryMatch(lemma), queryMatches),
                tooltipData: null
            }
        });
        this.label = appServices.importExternalMessage(conf.label || 'mergeCorpFreq__main_label');
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

    supportsQueryType(qt:QueryType, lang1:string, lang2?:string):boolean {
        return qt === QueryType.SINGLE_QUERY || qt === QueryType.TRANSLAT_QUERY || qt === QueryType.CMP_QUERY;
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
        return this.blockingTiles;
    }

    supportsMultiWordQueries():boolean {
        return true;
    }

    getIssueReportingUrl():null {
        return null;
    }
}

export const init:TileFactory.TileFactory<MergeCorpFreqTileConf>  = (args) => new MergeCorpFreqTile(args);