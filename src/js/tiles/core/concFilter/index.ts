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
import { Observable, of as rxOf } from 'rxjs';

import { IAppServices } from '../../../appServices';
import { QueryType } from '../../../common/query/index';
import { TileConf, ITileProvider, TileFactory, TileComponent } from '../../../common/tile';
import { ConcFilterModel } from './model';
import { init as viewInit } from './view';
import { ConcApi } from '../../../common/api/kontext/concordance';
import { ViewMode } from '../../../common/api/abstract/concordance';
import { LocalizedConfMsg } from '../../../common/types';
import { SwitchMainCorpApi } from '../../../common/api/kontext/switchMainCorp';
import { ISwitchMainCorpApi, SwitchMainCorpResponse } from '../../../common/api/abstract/switchMainCorp';
import { TileWait } from '../../../models/tileSync';


declare var require:(src:string)=>void;  // webpack
require('./style.less');


export interface ConcFilterTileConf extends TileConf {
    apiURL:string;
    switchMainCorpApiURL?:string;
    corpname:string;
    parallelLangMapping?:{[lang:string]:string};
    posAttrs:Array<string>;
    metadataAttrs?:Array<{value:string; label:LocalizedConfMsg}>;
}


class EmptyMainCorpSwitch implements ISwitchMainCorpApi {

    call(args:{concPersistenceID}):Observable<SwitchMainCorpResponse> {
        return rxOf({concPersistenceID: args.concPersistenceID});
    }
}

/**
 *
 */
export class ConcFilterTile implements ITileProvider {

    private readonly tileId:number;

    private readonly dispatcher:IActionDispatcher;

    private readonly model:ConcFilterModel;

    private readonly appServices:IAppServices;

    private view:TileComponent;

    private readonly widthFract:number;

    private readonly label:string;

    private readonly blockingTiles:Array<number>;

    constructor({tileId, waitForTiles, waitForTilesTimeoutSecs, subqSourceTiles, dispatcher, appServices, ut, widthFract,
            conf, theme, isBusy, cache, lang2, queryMatches}:TileFactory.Args<ConcFilterTileConf>) {
        this.tileId = tileId;
        this.dispatcher = dispatcher;
        this.widthFract = widthFract;
        this.appServices = appServices;
        this.blockingTiles = waitForTiles;
        this.model = new ConcFilterModel({
            queryMatches,
            dispatcher,
            tileId,
            waitForTiles,
            waitForTilesTimeoutSecs,
            subqSourceTiles,
            appServices,
            api: new ConcApi(true, cache, conf.apiURL, appServices.getApiHeaders(conf.apiURL)),
            switchMainCorpApi: conf.switchMainCorpApiURL ?
                new SwitchMainCorpApi(conf.switchMainCorpApiURL, appServices.getApiHeaders(conf.switchMainCorpApiURL)) :
                new EmptyMainCorpSwitch(),
            initState: {
                isBusy: isBusy,
                error: null,
                isTweakMode: false,
                isMobile: appServices.isMobileMode(),
                widthFract: widthFract,
                corpName: conf.corpname,
                otherCorpname: conf.parallelLangMapping ? conf.parallelLangMapping[lang2] : null,
                posAttrs: conf.posAttrs,
                lines: [],
                concPersistenceIds: [],
                viewMode: ViewMode.SENT,
                attrVmode: 'mouseover',
                itemsPerSrc: 1,
                visibleMetadataLine: -1,
                metadataAttrs: (conf.metadataAttrs || []).map(v => ({value: v.value, label: appServices.importExternalMessage(v.label)}))
            }
        });
        this.label = appServices.importExternalMessage(conf.label || 'collexamples__main_label');
        this.view = viewInit(this.dispatcher, ut, theme, this.model);
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
        this.model.suspend(TileWait.create([], ()=>false), (_, syncData)=>syncData);
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

    supportsMultiWordQueries():boolean {
        return true;
    }

    getIssueReportingUrl():null {
        return null;
    }
}

export const init:TileFactory.TileFactory<ConcFilterTileConf> = (args) => new ConcFilterTile(args);