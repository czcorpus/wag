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
import { StatelessModel } from 'kombo';
import { Maths } from 'cnc-tskit';

import { ITileProvider, TileFactory, TileComponent, TileConf, TileFactoryArgs } from '../../../page/tile';
import { IAppServices } from '../../../appServices';
import { WordFormsModel } from './model';
import { QueryType } from '../../../query/index';
import { init as viewInit } from './views';
import { createApiInstance } from '../../../api/factory/wordForms';
import { korpusApiAuthActionFactory, TileServerActionFactory } from '../../../server/tileActions';
import { CoreApiGroup } from '../../../api/coreGroups';


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
        waitForTiles, waitForTilesTimeoutSecs, theme, cache}:TileFactoryArgs<WordFormsTileConf>
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

    disable():void {} // ??

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

export const serverActions:() => Array<TileServerActionFactory> = () => [
    korpusApiAuthActionFactory,
];