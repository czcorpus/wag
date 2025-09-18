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
import { findCurrQueryMatch, QueryType } from '../../../query/index.js';
import { AltViewIconProps, DEFAULT_ALT_VIEW_ICON, ITileProvider, ITileReloader, TileComponent, TileConf, TileFactory, TileFactoryArgs } from '../../../page/tile.js';
import { GeoAreasModel } from './model.js';
import { init as compareViewInit } from './views/compare.js';
import { init as singleViewInit } from './views/single.js';
import { MapLoader } from './mapLoader.js';
import { MQueryFreqDistribAPI } from '../../../api/vendor/mquery/freqs.js';
import { validatePosQueryGenerator } from '../../../conf/validation.js';


export interface GeoAreasTileConf extends TileConf {
    apiURL:string;
    apiType:string;
    corpname:string;
    fcrit:string;
    freqType:'tokens'|'text-types';
    freqSort:string;
    fpage:number;
    fttIncludeEmpty:boolean;
    areaCodeMapping:{[name:string]:string};
    frequencyDisplayLimit:number;

    /**
     * A positional attribute name and a function name to create a query value (e.g. ['tag', 'ppTagset]).
     */
    posQueryGenerator:[string, string];
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
        tileId, dispatcher, appServices, ut, theme,
        widthFract, conf, isBusy, queryMatches, queryType,
    }:TileFactoryArgs<GeoAreasTileConf>) {
        this.tileId = tileId;
        this.label = appServices.importExternalMessage(conf.label);
        this.dispatcher = dispatcher;
        this.appServices = appServices;
        this.widthFract = widthFract;
        this.model = new GeoAreasModel({
            dispatcher,
            tileId,
            appServices,
            queryMatches,
            freqApi: new MQueryFreqDistribAPI(conf.apiURL, appServices, conf.backlink),
            mapLoader: new MapLoader(appServices),
            queryType,
            initState: {
                isBusy: isBusy,
                error: null,
                areaCodeMapping: {...conf.areaCodeMapping},
                mapSVG: '',
                tooltipArea: null,
                data: List.map(_ => [], queryMatches),
                corpname: conf.corpname,
                subcname: null, // TODO
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
                backlinks: List.map(_ => null, queryMatches),
            },
        });
        this.label = appServices.importExternalMessage(conf.label || 'geolocations__main_label');
        this.view = queryType === QueryType.CMP_QUERY || queryType === QueryType.PREVIEW && queryMatches.length > 1 ?
            compareViewInit(this.dispatcher, ut, theme, this.model) :
            singleViewInit(this.dispatcher, ut, theme, this.model);
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
    supportsQueryType(qt:QueryType, translatLang?:string):boolean {
        return qt === QueryType.SINGLE_QUERY || qt === QueryType.CMP_QUERY;
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

    getReadDataFrom():number|null {
        return null;
    }

    hideOnNoData():boolean {
        return false;
    }
}

export const init:TileFactory<GeoAreasTileConf> = {

    sanityCheck: (args) => {
        const err = validatePosQueryGenerator(args.conf.posQueryGenerator);
        if (err !== null) {
            return [err];
        }
    },

    create: (args) => new GeoAreasTile(args)
};

