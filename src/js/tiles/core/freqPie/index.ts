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
import { Ident } from 'cnc-tskit';

import { IAppServices } from '../../../appServices';
import { FreqSort } from '../../../api/vendor/kontext/freqs';
import { SubqueryModeConf } from '../../../models/tiles/freq';
import { LocalizedConfMsg } from '../../../types';
import { QueryType } from '../../../query/index';
import { ITileProvider, TileComponent, TileConf, TileFactory } from '../../../page/tile';
import { factory as defaultModelFactory, FreqBarModel } from '../freqBar/model';
import { factory as subqModelFactory } from '../freqBar/subqModel';
import { init as viewInit } from './view';
import { StatelessModel } from 'kombo';
import { ConcApi } from '../../../api/vendor/kontext/concordance';
import { createMultiBlockApiInstance } from '../../../api/factory/freqs';

declare var require:any;
require('./style.less');


export interface FreqPieTileConf extends TileConf {
    apiURL:string;
    apiType:string;
    corpname:string|null; // null can be used in case subqueryMode is enabled
    fcrit:string|Array<string>;
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


export class FreqPieTile implements ITileProvider {

    private readonly tileId:number;

    private readonly label:string;

    private readonly appServices:IAppServices;

    private readonly model:FreqBarModel;

    private readonly widthFract:number;

    private readonly view:TileComponent;

    private readonly blockingTiles:Array<number>;

    constructor({tileId, dispatcher, appServices, ut, theme, waitForTiles, waitForTilesTimeoutSecs, subqSourceTiles,
            widthFract, conf, isBusy, cache}:TileFactory.Args<FreqPieTileConf>) {
        this.tileId = tileId;
        this.appServices = appServices;
        this.widthFract = widthFract;
        this.blockingTiles = waitForTiles;
        this.label = this.appServices.importExternalMessage(conf.label);
        const criteria = typeof conf.fcrit === 'string' ? [conf.fcrit] : conf.fcrit;
        const labels = Array.isArray(conf.critLabels) ?
            conf.critLabels.map(v => this.appServices.importExternalMessage(v)) :
            [this.appServices.importExternalMessage(conf.critLabels)];
        const modelFact = conf.subqueryMode ?
            subqModelFactory(
                conf.subqueryMode,
                new ConcApi(false, cache, conf.subqueryMode.concApiURL, appServices)) :
            defaultModelFactory;
        this.model = modelFact(
            dispatcher,
            tileId,
            waitForTiles,
            waitForTilesTimeoutSecs,
            subqSourceTiles,
            appServices,
            createMultiBlockApiInstance(cache, conf.apiType, conf.apiURL, appServices),
            conf.backlink || null,
            {
                isBusy: isBusy,
                error: null,
                blocks: criteria.map(v => ({
                    data: [],
                    ident: Ident.puid(),
                    label: '',
                    isReady: false
                })),
                activeBlock: 0,
                corpname: conf.corpname,
                concId: null,
                fcrit: criteria,
                critLabels: labels,
                flimit: conf.flimit,
                freqSort: conf.freqSort,
                fpage: conf.fpage,
                fttIncludeEmpty: conf.fttIncludeEmpty,
                fmaxitems: 100,
                backlink: null,
                maxNumCategories: conf.maxNumCategories,
                subqSyncPalette: !!conf.subqueryMode,
                isAltViewMode: false
            }
        );
        this.label = appServices.importExternalMessage(conf.label || 'freqpie__main_label');
        this.view = viewInit(
            dispatcher,
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
        return qt === QueryType.SINGLE_QUERY || qt === QueryType.TRANSLAT_QUERY;
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

export const init:TileFactory.TileFactory<FreqPieTileConf> = (args) => new FreqPieTile(args);
