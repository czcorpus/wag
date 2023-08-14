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
import { Backlink, DEFAULT_ALT_VIEW_ICON, ITileProvider, TileComponent, TileConf, TileFactory, TileFactoryArgs } from '../../../page/tile';
import { GlobalComponents } from '../../../views/common';
import { MergeCorpFreqModel } from './model';
import { init as viewInit } from './view';
import { LocalizedConfMsg } from '../../../types';
import { findCurrQueryMatch } from '../../../models/query';
import { createApiInstance as createConcApiInstance } from '../../../api/factory/concordance';
import { createApiInstance as createFreqApiInstance } from '../../../api/factory/freqs';
import { CoreApiGroup } from '../../../api/coreGroups';


export interface MergeCorpFreqTileConf extends TileConf {
    apiURL:string;
    apiType:string;
    pixelsPerCategory?:number;
    sources:Array<{

        corpname:string;
        subcname?:string;
        corpusSize:number;
        fcrit:string;
        freqType:'tokens'|'text-types';
        flimit:number;
        freqSort:string;
        fpage:number;
        fttIncludeEmpty:boolean;

        /**
         * If true, then WaG will colorize a respective
         * freq. bar to a color different from the default one.
         * If multiple source items have this set to true
         * then each item will have its own unique color.
         *
         * Currently, this works only for the "single" mode.
         */
        uniqueColor?:boolean;

        /**
          * In case 'fcrit' describes a positional
          * attribute we have to replace the actual
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

    constructor({
        dispatcher, tileId, waitForTiles, waitForTilesTimeoutSecs, ut,
        theme, appServices, widthFract, conf, isBusy, cache, queryMatches
    }:TileFactoryArgs<MergeCorpFreqTileConf>) {

        this.dispatcher = dispatcher;
        this.tileId = tileId;
        this.widthFract = widthFract;
        this.label = appServices.importExternalMessage(conf.label);
        this.blockingTiles = waitForTiles;
        const apiOptions = conf.apiType === CoreApiGroup.KONTEXT_API ?
            {authenticateURL: appServices.createActionUrl("/MergeCorpFreqTile/authenticate")} :
            {};
        this.model = new MergeCorpFreqModel({
            dispatcher: this.dispatcher,
            tileId,
            waitForTiles,
            waitForTilesTimeoutSecs,
            appServices,
            concApi: createConcApiInstance(cache, conf.apiType, conf.apiURL, appServices, apiOptions),
            freqApi: createFreqApiInstance(cache, conf.apiType, conf.apiURL, appServices, apiOptions),
            initState: {
                isBusy: isBusy,
                isAltViewMode: false,
                error: null,
                data: [],
                sources: List.map(
                    src => ({
                        corpname: src.corpname,
                        corpusSize: src.corpusSize,
                        subcname: src.subcname || null,
                        fcrit: src.fcrit,
                        freqType: src.freqType,
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
                        isSingleCategory: !!src.isSingleCategory,
                        uniqueColor: !!src.uniqueColor
                    }),
                    conf.sources
                ),
                pixelsPerCategory: conf.pixelsPerCategory ? conf.pixelsPerCategory : 30,
                queryMatches: List.map(lemma => findCurrQueryMatch(lemma), queryMatches),
                tooltipData: null,
                appBacklink: null,
            },
            backlink: conf.backlink || null
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

    supportsQueryType(qt:QueryType, domain1:string, domain2?:string):boolean {
        return qt === QueryType.SINGLE_QUERY || qt === QueryType.TRANSLAT_QUERY || qt === QueryType.CMP_QUERY;
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

    getAltViewIcon():[string, string] {
        return DEFAULT_ALT_VIEW_ICON;
    }
}

export const init:TileFactory<MergeCorpFreqTileConf>  = {

    sanityCheck: (args) => [],

    create: (args) => new MergeCorpFreqTile(args)
};
