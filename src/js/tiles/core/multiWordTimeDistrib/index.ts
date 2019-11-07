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
import { IActionDispatcher, StatelessModel } from 'kombo';

import { ConcApi } from '../../../common/api/kontext/concordance';
import { FreqSort } from '../../../common/api/kontext/freqs';
import { createApiInstance } from './apiFactory';
import { QueryType } from '../../../common/query';
import { ITileProvider, TileComponent, TileFactory } from '../../../common/tile';
import { TimeDistTileConf, DataItemWithWCI } from './common';
import { TimeDistribModel } from './model';
import { AlphaLevel } from '../../../common/statistics';
import { init as viewInit } from './view';
import { findCurrLemmaVariant } from '../../../models/query';

declare var require:(src:string)=>void;  // webpack
require('./style.less');


/**
 * Important note: the tile works in two mutually exclusive
 * modes:
 * 1) depending on a concordance tile
 *   - in such case the concordance (subc)corpus must be
 *     the same as the (sub)corpus this tile works with
 *   - the 'waitFor' conf value must be set
 *   - the 'subcname' should have only one value (others are ignored)
 *
 * 2) independent - creating its own concordances, using possibly multiple subcorpora
 *   - the 'waitFor' cannot be present in the config
 *   - the 'subcname' can have any number of items
 *     - the tile queries all the subcorpora and then merges all the data
 *
 */
export class TimeDistTile implements ITileProvider {

    private readonly dispatcher:IActionDispatcher;

    private readonly tileId:number;

    private readonly model:TimeDistribModel;

    private readonly widthFract:number;

    private readonly view:TileComponent;

    private readonly label:string;

    private readonly blockingTiles:Array<number>;

    constructor({dispatcher, tileId, waitForTiles, ut, theme, appServices, widthFract, lemmas, lang1, conf, isBusy, cache}:TileFactory.Args<TimeDistTileConf>) {
        this.dispatcher = dispatcher;
        this.tileId = tileId;
        this.widthFract = widthFract;
        this.blockingTiles = waitForTiles;
        this.model = new TimeDistribModel({
            dispatcher: dispatcher,
            initState: {
                isBusy: isBusy,
                error: null,
                corpname: conf.corpname,
                subcnames: Immutable.List<string>(Array.isArray(conf.subcname) ? conf.subcname : [conf.subcname]),
                subcDesc: appServices.importExternalMessage(conf.subcDesc),
                concId: null,
                fcrit: conf.fcrit,
                flimit: conf.flimit,
                freqSort: FreqSort.REL,
                fpage: 1,
                fttIncludeEmpty: false,
                fmaxitems: 100,
                alphaLevel: AlphaLevel.LEVEL_0_1, // TODO conf/explain
                data: lemmas.map(_ => Immutable.List<DataItemWithWCI>()).toList(),
                posQueryGenerator: conf.posQueryGenerator,
                wordLabels: lemmas.map(l => findCurrLemmaVariant(l).word),
            },
            tileId: tileId,
            waitForTile: waitForTiles[0] || -1,
            api: createApiInstance(
                conf.apiType,
                cache,
                conf,
                appServices.getApiHeaders(conf.apiURL)
            ),
            concApi: conf.concApiURL ? new ConcApi(false, cache, conf.concApiURL, appServices.getApiHeaders(conf.apiURL)) : null,
            appServices: appServices,
            lemmas: lemmas,
            queryLang: lang1,
            backlink: conf.backlink
        });
        this.label = appServices.importExternalMessage(conf.label || 'multiWordTimeDistrib__main_label');
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
        return qt === QueryType.CMP_QUERY;
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

    supportsAltView():boolean {
        return false;
    }

    exposeModel():StatelessModel<{}>|null {
        return this.model;
    }

    getBlockingTiles():Array<number> {
        return this.blockingTiles;
    }

    supportsNonDictQueries():boolean {
        return true;
    }
}

export const TILE_TYPE = 'MultiWordTimeDistribTile';

export const init:TileFactory.TileFactory<TimeDistTileConf>  = (args) => new TimeDistTile(args);