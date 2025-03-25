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
import { IActionDispatcher } from 'kombo';
import { Dict, List, Maths, pipe, tuple } from 'cnc-tskit';

import { QueryType } from '../../../query/index.js';
import { AltViewIconProps, DEFAULT_ALT_VIEW_ICON, ITileProvider, ITileReloader, TileComponent,
    TileFactory, TileFactoryArgs } from '../../../page/tile.js';
import { TimeDistTileConf } from './common.js';
import { TimeDistribModel, LoadingStatus } from './model.js';
import { init as viewInit } from './view.js';
import { TileWait } from '../../../models/tileSync.js';
import { TimeDistribApi } from '../../../api/abstract/timeDistrib.js';
import { CoreApiGroup } from '../../../api/coreGroups.js';


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

    constructor({
        dispatcher, tileId, waitForTiles, waitForTilesTimeoutSecs, ut, theme, appServices,
        widthFract, queryMatches, domain1, conf, isBusy, mainPosAttr, useDataStream
    }:TileFactoryArgs<TimeDistTileConf>) {

        this.dispatcher = dispatcher;
        this.tileId = tileId;
        this.widthFract = widthFract;
        this.blockingTiles = waitForTiles;

        this.model = new TimeDistribModel({
            dispatcher: dispatcher,
            initState: {
                loadingStatus: isBusy ? LoadingStatus.BUSY_LOADING_MAIN : LoadingStatus.IDLE,
                error: null,
                corpname: conf.corpname,
                subcnames: Array.isArray(conf.subcname) ? [...conf.subcname] : [conf.subcname],
                subcDesc: appServices.importExternalMessage(conf.subcDesc),
                mainPosAttr,
                concId: null,
                alphaLevel: Maths.AlphaLevel.LEVEL_1, // TODO conf/explain
                data: [],
                dataCmp: [],
                customApiArgs: conf.customApiArgs ? conf.customApiArgs : {},
                posQueryGenerator: conf.posQueryGenerator,
                isTweakMode: false,
                useAbsFreq: false,
                displayObserved: conf.showMeasuredFreq || false,
                wordMainLabel: '',
                wordCmpInput: '',
                wordCmp: '',
                zoom: [null, null],
                refArea: [null, null],
                backlinks: [],
                subcBacklinkLabel: conf.subcBacklinkLabel || {},
            },
            tileId: tileId,
            waitForTile: waitForTiles.length > 0 ? waitForTiles[0] : -1,
            waitForTilesTimeoutSecs,
            appServices: appServices,
            queryMatches,
            queryDomain: domain1,
            backlink: conf.backlink
        });
        this.label = appServices.importExternalMessage(conf.label || 'timeDistrib__main_label');
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
        return qt === QueryType.SINGLE_QUERY || qt === QueryType.TRANSLAT_QUERY;
    }

    disable():void {
        this.model.waitForAction(TileWait.create([], ()=>false), (_, syncData)=>syncData);
    }

    getWidthFract():number {
        return this.widthFract;
    }

    supportsTweakMode():boolean {
        return true;
    }

    supportsAltView():boolean {
        return false;
    }

    supportsSVGFigureSave():boolean {
        return false;
    }

    getAltViewIcon():AltViewIconProps {
        return DEFAULT_ALT_VIEW_ICON;
    }

    registerReloadModel(model:ITileReloader):boolean {
        model.registerModel(this, this.model);
        return true;
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

export const init:TileFactory<TimeDistTileConf> = {

    sanityCheck: (args) => {
        let ans = [];
        switch (args.conf.apiType) {
            case CoreApiGroup.MQUERY:
                if (!Dict.hasKey('attr', args.conf.customApiArgs) && !Dict.hasKey('fcrit', args.conf.customApiArgs)) {
                    ans.push(new Error(`${args.conf.tileType}: missing \`attr\` or \`fcrit\` in \`customApiArgs\``));

                } else if (Dict.hasKey('attr', args.conf.customApiArgs) && Dict.hasKey('fcrit', args.conf.customApiArgs)) {
                    ans.push(new Error(`${args.conf.tileType}: Only one \`attr\` or \`fcrit\` can be defined in \`customApiArgs\``));
                }
                if (!Dict.hasKey('maxItems', args.conf.customApiArgs)) {
                    ans.push(new Error(`${args.conf.tileType}: missing \`maxItems\` in \`customApiArgs\``));
                }
                break;

            case CoreApiGroup.KONTEXT:
            case CoreApiGroup.KONTEXT_API:
            case CoreApiGroup.NOSKE:
                if (!Dict.hasKey('fcrit', args.conf.customApiArgs)) {
                    ans.push(new Error(`${args.conf.tileType}: missing \`fcrit\` in \`customApiArgs\``));
                }
                if (!Dict.hasKey('flimit', args.conf.customApiArgs)) {
                    ans.push(new Error(`${args.conf.tileType}: missing \`flimit\` in \`customApiArgs\``));
                }
                break;

            default:
                ans.push(new Error(`${args.conf.tileType}: unknown api type \`${args.conf.apiType}\``));
        }
        return ans;
    },

    create: (args) => new TimeDistTile(args)
};
