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

import * as Immutable from 'immutable';
import { ITileProvider, TileFactory, QueryType, TileComponent, TileConf, Backlink } from '../../common/types';
import {init as viewInit} from './view';
import { ActionDispatcher, ViewUtils } from "kombo";
import { MergeCorpFreqModel, ModelSourceArgs, SourceMappedDataRow } from "./model";
import { FreqDistribAPI, DataRow } from "../../common/api/kontextFreqs";
import { GlobalComponents } from "../../views/global";
import { puid } from '../../common/util';

declare var require:(src:string)=>void;  // webpack
require('./style.less');


export interface MergeCorpFreqTileConf extends TileConf {
    tileType:'MergeCorpFreqTile';
    apiURL:string;
    pixelsPerItem?:number;
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
        valuePlaceholder?:string;
        backlink?:Backlink;
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

    private readonly dispatcher:ActionDispatcher;

    private readonly ut:ViewUtils<GlobalComponents>;

    private readonly model:MergeCorpFreqModel;

    private readonly tileId:number;

    private view:TileComponent;

    private readonly label:string;

    private readonly widthFract:number;

    constructor({dispatcher, tileId, waitForTiles, ut,
                theme, appServices, widthFract, conf}:TileFactory.Args<MergeCorpFreqTileConf>) {
        this.dispatcher = dispatcher;
        this.tileId = tileId;
        this.widthFract = widthFract;
        this.label = appServices.importExternalMessage(conf.label);
        this.model = new MergeCorpFreqModel(
            this.dispatcher,
            tileId,
            waitForTiles,
            appServices,
            new FreqDistribAPI(conf.apiURL),
            {
                isBusy: false,
                error: null,
                data: Immutable.List<SourceMappedDataRow>(),
                sources: Immutable.List<ModelSourceArgs>(conf.sources.map(src => ({
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
                    uuid: puid(),
                    backlinkTpl: src.backlink || null,
                    backlink: null
                }))),
                pixelsPerItem: conf.pixelsPerItem ? conf.pixelsPerItem : 40
            }
        );
        this.view = viewInit(this.dispatcher, ut, theme, this.model);
    }

    getIdent():number {
        return this.tileId;
    }

    getView():TileComponent {
        return this.view;
    }

    getLabel():string {
        return this.label ? this.label : this.ut.translate('ttDistrib__main_label');
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


export const init:TileFactory.TileFactory<MergeCorpFreqTileConf>  = (args) => new MergeCorpFreqTile(args);