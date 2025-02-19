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
import { Maths } from 'cnc-tskit';

import { ITileProvider, TileFactory, TileComponent, TileConf, TileFactoryArgs, DEFAULT_ALT_VIEW_ICON, ITileReloader, AltViewIconProps } from '../../../page/tile.js';
import { IAppServices } from '../../../appServices.js';
import { WordFormsModel } from './model.js';
import { QueryType } from '../../../query/index.js';
import { init as viewInit } from './views.js';
import { createApiInstance } from '../../../api/factory/wordForms.js';
import { CoreApiGroup } from '../../../api/coreGroups.js';


export interface WordFormsTileConf extends TileConf {
    apiType:string;
    apiURL:string;
    corpname:string;
    corpusSize:number;
    freqFilterAlphaLevel:Maths.AlphaLevel;
}


export class WordFormsTile implements ITileProvider {

    private readonly tileId:number;

    private readonly label:string;

    private readonly appServices:IAppServices;

    private readonly model:WordFormsModel;

    private readonly widthFract:number;

    private readonly view:TileComponent;

    private readonly waitForTiles:Array<number>;

    constructor({
        tileId, dispatcher, appServices, ut, queryMatches, domain1, widthFract, conf, isBusy,
        waitForTiles, waitForTilesTimeoutSecs, theme, cache, mainPosAttr}:TileFactoryArgs<WordFormsTileConf>
    ) {

        this.tileId = tileId;
        this.appServices = appServices;
        this.widthFract = widthFract;
        this.waitForTiles = waitForTiles;
        this.label = this.appServices.importExternalMessage(conf.label || 'wordforms__main_label');
        const apiOptions = conf.apiType === CoreApiGroup.KONTEXT_API ?
            {authenticateURL: appServices.createActionUrl("/MultiWordGeoAreas/authenticate")} :
            {};
        this.model = new WordFormsModel({
            dispatcher,
            initialState: {
                isBusy: isBusy,
                isAltViewMode: false,
                error: null,
                corpname: conf.corpname,
                roundToPos: 1,
                corpusSize: conf.corpusSize,
                freqFilterAlphaLevel: conf.freqFilterAlphaLevel,
                data: [],
                backlink: null,
                mainPosAttr
            },
            tileId,
            api: createApiInstance({
                apiIdent: conf.apiType,
                cache,
                apiURL: conf.apiURL,
                srcInfoURL: conf.srcInfoURL,
                apiServices: appServices,
                apiOptions
            }),
            queryMatches,
            queryDomain: domain1,
            waitForTile: waitForTiles.length > 0 ? waitForTiles[0] : -1,
            waitForTilesTimeoutSecs,
            appServices,
            backlink: conf.backlink || null,
        });
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

    supportsQueryType(qt:QueryType, domain1:string, domain2?:string):boolean {
        return qt === QueryType.SINGLE_QUERY;
    }

    disable():void {
        this.model.waitForAction({}, (_, sd) => sd);
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

    getAltViewIcon():AltViewIconProps {
        return DEFAULT_ALT_VIEW_ICON;
    }

    registerReloadModel(model:ITileReloader):boolean {
        model.registerModel(this, this.model);
        return true;
    }

    /**
     * Return a list of tiles this tile depends on
     */
    getBlockingTiles():Array<number> {
        return this.waitForTiles;
    }

    supportsMultiWordQueries():boolean {
        return true;
    }

    getIssueReportingUrl():null {
        return null;
    }
}

export const init:TileFactory<WordFormsTileConf> = {

    sanityCheck: (args) => [],

    create: (args) => new WordFormsTile(args)
};
