/*
 * Copyright 2019 Martin Zimandl <martin.zimandl@gmail.com>
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
import { List, Maths, pipe } from 'cnc-tskit';

import { FreqSort } from '../../../api/vendor/kontext/freqs';
import { createApiInstance as createFreqApiInstance } from '../../../api/factory/timeDistrib';
import { QueryType } from '../../../query/index';
import { AltViewIconProps, DEFAULT_ALT_VIEW_ICON, ITileProvider, ITileReloader, TileComponent, TileFactory, TileFactoryArgs } from '../../../page/tile';
import { TimeDistTileConf } from './common';
import { MultiWordTimeDistribModel } from './model';
import { init as viewInit } from './view';
import { findCurrQueryMatch } from '../../../models/query';
import { PriorityValueFactory } from '../../../priority';
import { createApiInstance as createConcApiInstance } from '../../../api/factory/concordance';
import { IConcordanceApi } from '../../../api/abstract/concordance';
import { TimeDistribApi } from '../../../api/abstract/timeDistrib';
import { CoreApiGroup } from '../../../api/coreGroups';


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
export class MultiWordTimeDistTile implements ITileProvider {

    private readonly dispatcher:IActionDispatcher;

    private readonly tileId:number;

    private readonly model:MultiWordTimeDistribModel;

    private readonly widthFract:number;

    private readonly view:TileComponent;

    private readonly label:string;

    private readonly blockingTiles:Array<number>;

    constructor({
        dispatcher, tileId, waitForTiles, waitForTilesTimeoutSecs, ut, theme, appServices,
        widthFract, queryMatches, domain1, conf, isBusy, cache
    }:TileFactoryArgs<TimeDistTileConf>) {

        this.dispatcher = dispatcher;
        this.tileId = tileId;
        this.widthFract = widthFract;
        this.blockingTiles = waitForTiles;

        const apiUrlList = typeof conf.apiURL === 'string' ? [conf.apiURL] : conf.apiURL;
        const apiFactory = new PriorityValueFactory<[IConcordanceApi<{}>, TimeDistribApi]>(conf.apiPriority || List.repeat(() => 1, apiUrlList.length));
        const apiOptions = conf.apiType === CoreApiGroup.KONTEXT_API ?
            {authenticateURL: appServices.createActionUrl("/MultiWordTimeDistribTile/authenticate")} :
            {};
        pipe(
            apiUrlList,
            List.forEach(
                (url, i) => apiFactory.addInstance(
                    i,
                    [
                        createConcApiInstance(
                            cache,
                            conf.apiType,
                            url,
                            appServices,
                            apiOptions,
                        ),
                        createFreqApiInstance(
                            conf.apiType,
                            cache,
                            url,
                            appServices,
                            {
                                ...conf.customApiArgs,
                                fcrit: conf.fcrit,
                                flimit: '' + conf.flimit
                            },
                            apiOptions
                        )
                    ]
                )
            )
        );
        this.model = new MultiWordTimeDistribModel({
            dispatcher: dispatcher,
            initState: {
                isBusy: isBusy,
                error: null,
                corpname: conf.corpname,
                subcnames: Array.isArray(conf.subcname) ? conf.subcname : [conf.subcname],
                subcDesc: appServices.importExternalMessage(conf.subcDesc),
                concId: null,
                fcrit: conf.fcrit,
                freqType: 'text-types',
                flimit: conf.flimit,
                freqSort: FreqSort.REL,
                fpage: 1,
                fttIncludeEmpty: false,
                fmaxitems: 100,
                alphaLevel: Maths.AlphaLevel.LEVEL_1, // TODO conf/explain
                data: List.map(_ => [], queryMatches),
                posQueryGenerator: conf.posQueryGenerator,
                wordLabels: List.map(l => findCurrQueryMatch(l).word, queryMatches),
                averagingYears: 0,
                isTweakMode: false,
                units: '%',
                zoom: [null, null],
                refArea: [null, null],
                backlinks: [],
            },
            tileId: tileId,
            waitForTile: waitForTiles[0] || -1,
            waitForTilesTimeoutSecs,
            apiFactory: apiFactory,
            appServices: appServices,
            queryMatches,
            queryDomain: domain1,
            backlink: conf.backlink || null
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

    supportsQueryType(qt:QueryType, domain1:string, domain2?:string):boolean {
        return qt === QueryType.CMP_QUERY;
    }

    disable():void {
        this.model.waitForAction({}, (_, syncData)=>syncData);
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

    sanityCheck: (args) => [],

    create: (args) => new MultiWordTimeDistTile(args)
};
