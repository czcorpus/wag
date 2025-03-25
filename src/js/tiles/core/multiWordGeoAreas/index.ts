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
import { List } from 'cnc-tskit';
import { IAppServices } from '../../../appServices.js';
import { FreqSort } from '../../../api/vendor/kontext/freqs.js';
import { QueryType } from '../../../query/index.js';
import { AltViewIconProps, DEFAULT_ALT_VIEW_ICON, ITileProvider, ITileReloader, TileComponent, TileConf, TileFactory, TileFactoryArgs } from '../../../page/tile.js';
import { MultiWordGeoAreasModel } from './model.js';
import { init as viewInit } from './views/index.js';
import { MapLoader } from './mapLoader.js';
import { findCurrQueryMatch } from '../../../models/query.js';
import { createApiInstance as createFreqApiInstance} from '../../../api/factory/freqs.js';
import { createApiInstance as createConcApiInstance } from '../../../api/factory/concordance.js';
import { CoreApiGroup } from '../../../api/coreGroups.js';


export interface MultiWordGeoAreasTileConf extends TileConf {
    apiURL:string;
    apiType:string;
    corpname:string;
    fcrit:string;
    freqType:'tokens'|'text-types';
    freqSort:FreqSort;
    fpage:number;
    fttIncludeEmpty:boolean;
    areaCodeMapping:{[name:string]:string};
    posQueryGenerator:[string, string];
    frequencyDisplayLimit:number;
}


export class MultiWordGeoAreasTile implements ITileProvider {

    private readonly tileId:number;

    private label:string;

    private readonly dispatcher:IActionDispatcher;

    private readonly appServices:IAppServices;

    private readonly model:MultiWordGeoAreasModel;

    private readonly view:TileComponent;

    private readonly widthFract:number;

    private readonly blockingTiles:Array<number>;

    constructor({
        tileId, dispatcher, appServices, ut, theme, waitForTiles, waitForTilesTimeoutSecs,
        widthFract, conf, isBusy, queryMatches
    }:TileFactoryArgs<MultiWordGeoAreasTileConf>) {

        this.tileId = tileId;
        this.label = appServices.importExternalMessage(conf.label);
        this.dispatcher = dispatcher;
        this.appServices = appServices;
        this.widthFract = widthFract;
        this.blockingTiles = waitForTiles;
        const apiOptions = conf.apiType === CoreApiGroup.KONTEXT_API ?
            {authenticateURL: appServices.createActionUrl("/MultiWordGeoAreasTile/authenticate")} :
            {};
        this.model = new MultiWordGeoAreasModel({
            dispatcher,
            tileId,
            waitForTile: waitForTiles[0],
            waitForTilesTimeoutSecs,
            appServices,
            queryMatches,
            concApi: createConcApiInstance(conf.apiType, conf.apiURL, false, appServices, apiOptions),
            freqApi: createFreqApiInstance(conf.apiType, conf.apiURL, conf.useDataStream, appServices, apiOptions),
            mapLoader: new MapLoader(appServices),
            initState: {
                isBusy: isBusy,
                error: null,
                areaCodeMapping: {...conf.areaCodeMapping},
                mapSVG: '',
                tooltipArea: null,
                data: List.map(_ => [], queryMatches),
                corpname: conf.corpname,
                concId: null,
                fcrit: conf.fcrit,
                freqType: conf.freqType,
                flimit: 1,  // necessary for the freqApi
                frequencyDisplayLimit: conf.frequencyDisplayLimit,
                freqSort: conf.freqSort,
                fpage: conf.fpage,
                fttIncludeEmpty: conf.fttIncludeEmpty,
                fmaxitems: 100,
                isAltViewMode: false,
                posQueryGenerator: conf.posQueryGenerator,
                currQueryMatches: List.map(lemma => findCurrQueryMatch(lemma), queryMatches),
                backlinks: [],
            },
            backlink: conf.backlink || null,
        });
        this.label = appServices.importExternalMessage(conf.label || 'geolocations__main_label');
        this.view = viewInit(this.dispatcher, ut, theme, this.model);
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
        return false;
    }

    supportsAltView():boolean {
        return true;
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

export const init:TileFactory<MultiWordGeoAreasTileConf> = {

    sanityCheck: (args) => [],

    create: (args) => new MultiWordGeoAreasTile(args)
};

