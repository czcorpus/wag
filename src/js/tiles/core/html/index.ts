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
import { IActionDispatcher, StatelessModel } from 'kombo';

import { IAppServices } from '../../../appServices';
import { QueryType } from '../../../query/index';
import { HtmlModel } from './model';
import { init as viewInit } from './views';
import { TileConf, ITileProvider, TileComponent, TileFactory } from '../../../page/tile';
import { CoreApiGroup } from '../../../api/coreGroups';
import { createApiInstance } from '../../../api/factory/html';
import { IGeneralHtmlAPI } from '../../../api/abstract/html';


declare var require:(src:string)=>void;  // webpack
require('./style.less');


export interface HtmlTileConf extends TileConf {
    apiURL:string;
    apiType:CoreApiGroup;
    sanitizeHTML?:boolean;
    args?:{[key:string]:string};
    lemmaArg?:string;
}

/**
 * This tile provides general HTML injection from an external
 * service into the tile. Please use only with trusted APIs and
 * services.
 */
export class HtmlTile implements ITileProvider {

    private readonly tileId:number;

    private readonly dispatcher:IActionDispatcher;

    private readonly appServices:IAppServices;

    private readonly model:HtmlModel;

    private readonly widthFract:number;

    private readonly label:string;

    private readonly api:IGeneralHtmlAPI<{}>;

    private view:TileComponent;

    constructor({tileId, dispatcher, appServices, ut, theme, widthFract, conf, isBusy, cache, queryMatches,}:TileFactory.Args<HtmlTileConf>) {
        this.tileId = tileId;
        this.dispatcher = dispatcher;
        this.appServices = appServices;
        this.widthFract = widthFract;
        this.api = createApiInstance(cache, conf.apiType, conf.apiURL, appServices);
        this.model = new HtmlModel({
            dispatcher: dispatcher,
            tileId: tileId,
            appServices: appServices,
            service: this.api,
            queryMatches,
            initState: {
                isBusy: isBusy,
                tileId: tileId,
                widthFract: widthFract,
                error: null,
                data: null,
                args: conf.args,
                lemmaArg: conf.lemmaArg,
                sanitizeHTML: !!conf.sanitizeHTML
            }
        });
        this.label = appServices.importExternalMessage(conf.label || 'html__main_label');
        this.view = viewInit(
            this.dispatcher,
            ut,
            theme,
            this.model
        );
    }

    getIdent():number {
        return this.tileId;
    }

    getLabel():string {
        return this.label;
    }

    getView():TileComponent {
        return this.view;
    }

    getSourceInfoComponent():null {
        return null;
    }

    supportsQueryType(qt:QueryType, lang1:string, lang2?:string):boolean {
        return qt === QueryType.SINGLE_QUERY || qt === QueryType.TRANSLAT_QUERY;
    }

    disable():void {
        this.model.suspend({}, (_, syncData)=>syncData);
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
        return [];
    }

    supportsMultiWordQueries():boolean {
        return this.api.supportsMultiWordQueries();
    }

    getIssueReportingUrl():null {
        return null;
    }
}

export const init:TileFactory.TileFactory<HtmlTileConf> = (args) => new HtmlTile(args);