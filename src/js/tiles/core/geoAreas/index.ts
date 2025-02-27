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

import { IAppServices } from '../../../appServices.js';
import { FreqSort } from '../../../api/vendor/kontext/freqs.js';
import { QueryType } from '../../../query/index.js';
import { AltViewIconProps, DEFAULT_ALT_VIEW_ICON, ITileProvider, ITileReloader, TileComponent, TileConf, TileFactory, TileFactoryArgs } from '../../../page/tile.js';
import { GeoAreasModel } from './model.js';
import { init as viewInit } from './views/index.js';
import { MapLoader } from './mapLoader.js';
import { createApiInstance as createFreqApiInstance } from '../../../api/factory/freqs.js';
import { CoreApiGroup } from '../../../api/coreGroups.js';


export interface GeoAreasTileConf extends TileConf {
    apiURL:string;
    apiType:string;
    corpname:string;
    fcrit:string;
    freqType:'tokens'|'text-types';
    flimit:number;
    freqSort:FreqSort;
    fpage:number;
    fttIncludeEmpty:boolean;
    areaCodeMapping:{[name:string]:string};
    frequencyDisplayLimit:number;
}


export class GeoAreasTile implements ITileProvider {

    private readonly tileId:number;

    private label:string;

    private readonly dispatcher:IActionDispatcher;

    private readonly appServices:IAppServices;

    private readonly model:GeoAreasModel;

    private readonly view:TileComponent;

    private readonly widthFract:number;

    private readonly blockingTiles:Array<number>;

    constructor({
        tileId, dispatcher, appServices, ut, theme, waitForTiles, waitForTilesTimeoutSecs,
        widthFract, conf, isBusy, cache
    }:TileFactoryArgs<GeoAreasTileConf>) {

        this.tileId = tileId;
        this.label = appServices.importExternalMessage(conf.label);
        this.dispatcher = dispatcher;
        this.appServices = appServices;
        this.widthFract = widthFract;
        this.blockingTiles = waitForTiles;
        const apiOptions = conf.apiType === CoreApiGroup.KONTEXT_API ?
            {authenticateURL: appServices.createActionUrl("/GeoAreasTile/authenticate")} :
            {};
        this.model = new GeoAreasModel({
            dispatcher,
            tileId,
            waitForTile: waitForTiles.length > 0 ? waitForTiles[0] : -1,
            waitForTilesTimeoutSecs,
            appServices,
            api: createFreqApiInstance(cache, conf.apiType, conf.apiURL, appServices, apiOptions),
            mapLoader: new MapLoader(cache, appServices),
            initState: {
                isBusy: isBusy,
                error: null,
                areaCodeMapping: {...conf.areaCodeMapping},
                mapSVG: '',
                tooltipArea: null,
                data: [],
                corpname: conf.corpname,
                concId: null,
                fcrit: conf.fcrit,
                freqType: conf.freqType,
                flimit: conf.flimit,
                freqSort: conf.freqSort,
                fpage: conf.fpage,
                fttIncludeEmpty: conf.fttIncludeEmpty,
                fmaxitems: 100,
                isAltViewMode: false,
                frequencyDisplayLimit: conf.frequencyDisplayLimit,
                backlink: null,
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
        return qt === QueryType.SINGLE_QUERY;
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

export const init:TileFactory<GeoAreasTileConf> = {

    create: (args) => new GeoAreasTile(args),

    sanityCheck: (args) => []
};
