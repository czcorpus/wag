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

import { QueryType } from '../../../common/query';
import { ITileProvider, TileComponent, TileConf, TileFactory } from '../../../common/tile';
import { TreqSubsetModel } from './model';
import { TreqSubsetsAPI } from '../../../common/api/treq';
import {init as viewInit} from './view';
import { StatelessModel } from 'kombo';
import { LocalizedConfMsg } from '../../../common/types';
import { List } from 'cnc-tskit';

declare var require:any;
require('./style.less');


export interface PackageGroup {
    label?:LocalizedConfMsg;
    packages:Array<string>;
}


export interface TreqSubsetsTileConf extends TileConf {
    srchPackages:{[lang:string]:Array<PackageGroup>};
    apiURL:string;
    minItemFreq?:number;
}


export class TreqSubsetsTile implements ITileProvider {

    private readonly tileId:number;

    private readonly widthFract:number;

    private readonly model:TreqSubsetModel;

    private readonly view:TileComponent;

    private readonly label:string;

    private readonly blockingTiles:Array<number>;

    private static readonly DEFAULT_MIN_ITEM_FREQ = 1;

    constructor({tileId, dispatcher, appServices, theme, ut, lang1, lang2, widthFract, waitForTiles, queryMatches, conf, isBusy, cache}:TileFactory.Args<TreqSubsetsTileConf>) {
        this.tileId = tileId;
        this.widthFract = widthFract;
        this.blockingTiles = waitForTiles;
        this.model = new TreqSubsetModel({
            dispatcher,
            appServices,
            initialState: {
                lang1: lang1,
                lang2: lang2,
                isBusy: isBusy,
                isAltViewMode: false,
                error: null,
                subsets: List.map(
                    v => ({
                        ident: v.packages.join('|'),
                        label: v.label ? appServices.importExternalMessage(v.label) : v.packages.join(', '),
                        translations: [],
                        packages: [...v.packages],
                        isPending: false
                    }),
                    conf.srchPackages[lang2] || []
                ),
                highlightedRowIdx: -1,
                maxNumLines: 12,
                colorMap: {},
                minItemFreq: conf.minItemFreq || TreqSubsetsTile.DEFAULT_MIN_ITEM_FREQ
            },
            tileId,
            api: new TreqSubsetsAPI(cache, conf.apiURL),
            queryMatches,
            waitForColorsTile: waitForTiles[0]
        });
        this.label = appServices.importExternalMessage(conf.label || 'treqsubsets__main_label');
        this.view = viewInit(dispatcher, ut, theme, this.model);
    }

    getLabel():string {
        return this.label;
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

    /**
     */
    supportsQueryType(qt:QueryType, lang1:string, lang2?:string):boolean {
        return qt === QueryType.TRANSLAT_QUERY;
    }

    disable():void {
        // TODO
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

export const init:TileFactory.TileFactory<TreqSubsetsTileConf> = (args) => new TreqSubsetsTile(args);