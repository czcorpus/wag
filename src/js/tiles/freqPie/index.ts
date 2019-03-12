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
import * as Immutable from 'immutable';

import { AppServices } from '../../appServices';
import { MultiBlockFreqDistribAPI } from '../../common/api/kontext/freqs';
import { FreqDataBlock, SubqueryModeConf } from '../../common/models/freq';
import { ITileProvider, LocalizedConfMsg, QueryType, TileComponent, TileConf, TileFactory } from '../../common/types';
import { puid } from '../../common/util';
import { factory as defaultModelFactory, FreqPieDataRow, FreqPieModel } from './model';
import { factory as subqModelFactory } from './subqModel';
import { init as viewInit } from './view';

declare var require:any;
require('./style.less');


export interface FreqPieTileConf extends TileConf {
    tileType:'FreqPieTile';
    apiURL:string;
    corpname:string|null; // null can be used in case subqueryMode is enabled
    fcrit:string|Array<string>;
    critLabels:LocalizedConfMsg|Array<LocalizedConfMsg>;
    flimit:number;
    freqSort:string;
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

    private readonly appServices:AppServices;

    private readonly model:FreqPieModel;

    private readonly widthFract:number;

    private view:TileComponent;

    constructor({tileId, dispatcher, appServices, ut, theme, waitForTiles, widthFract, conf}:TileFactory.Args<FreqPieTileConf>) {
        this.tileId = tileId;
        this.appServices = appServices;
        this.widthFract = widthFract;
        this.label = this.appServices.importExternalMessage(conf.label);
        const criteria = typeof conf.fcrit === 'string' ? [conf.fcrit] : conf.fcrit;
        const labels = Array.isArray(conf.critLabels) ?
            conf.critLabels.map(v => this.appServices.importExternalMessage(v)) :
            [this.appServices.importExternalMessage(conf.critLabels)];
        const modelFact = conf.subqueryMode ? subqModelFactory(conf.subqueryMode) : defaultModelFactory;
        this.model = modelFact(
            dispatcher,
            {
                isBusy: false,
                error: null,
                blocks: Immutable.List<FreqDataBlock<FreqPieDataRow>>(criteria.map(v => ({
                    data: Immutable.List<FreqPieDataRow>(),
                    ident: puid()
                }))),
                activeBlock: 0,
                corpname: conf.corpname,
                concId: null,
                fcrit: Immutable.List<string>(criteria),
                critLabels: Immutable.List<string>(labels),
                flimit: conf.flimit,
                freqSort: conf.freqSort,
                fpage: conf.fpage,
                fttIncludeEmpty: conf.fttIncludeEmpty,
                fmaxitems: 100,
                backlink: null,
                maxNumCategories: conf.maxNumCategories,
                useConsistentPalette: !!conf.subqueryMode
            },
            tileId,
            waitForTiles[0],
            appServices,
            new MultiBlockFreqDistribAPI(conf.apiURL, appServices.getApiHeaders(conf.apiURL)),
            conf.backlink || null
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

    supportsQueryType(qt:QueryType, lang1:string, lang2?:string):boolean {
        return qt === QueryType.SINGLE_QUERY || qt === QueryType.TRANSLAT_QUERY;
    }

    disable():void {
        this.model.suspend(()=>false);
    }

    getWidthFract():number {
        return this.widthFract;
    }

    supportsTweakMode():boolean {
        return false;
    }

    supportsHelpView():boolean {
        return true;
    }
}


export const init:TileFactory.TileFactory<FreqPieTileConf> = (args) => new FreqPieTile(args);
