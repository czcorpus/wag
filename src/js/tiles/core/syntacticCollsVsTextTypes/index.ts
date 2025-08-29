/*
 * Copyright 2025 Tomas Machalek <tomas.machalek@gmail.com>
 * Copyright 2025 Institute of the Czech National Corpus,
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
import { AltViewIconProps, ITileProvider, ITileReloader, TileComponent, TileConf, TileFactory, TileFactoryArgs } from '../../../page/tile.js';
import { IAppServices } from '../../../appServices.js';
import { SyntacticCollsVsTTModel } from './model.js';
import { init as viewInit } from './view.js';
import { findCurrQueryMatch, QueryType } from '../../../query/index.js';
import { LocalizedConfMsg } from '../../../types.js';
import { List } from 'cnc-tskit';
import { WSServerSyntacticCollsTTAPI } from './api.js';
import { AttrNamesConf, SyntacticCollsExamplesAPI } from '../syntacticColls/eApi/mquery.js';


interface TTConf {
    id:string;
    label:LocalizedConfMsg;
}


export interface SyntacticCollsVsTextTypesTileConf extends TileConf {
    apiURL:string;
    eApiURL:string;
    textTypes:Array<TTConf>;
    corpname:string;
    maxItems:number;
    attrNames:AttrNamesConf;
}


export class SyntacticCollsVsTextTypesTile implements ITileProvider {

    private readonly tileId:number;

    private readonly dispatcher:IActionDispatcher;

    private readonly appServices:IAppServices;

    private readonly model:SyntacticCollsVsTTModel;

    private readonly widthFract:number;

    private readonly label:string;

    private view:TileComponent;

    constructor({
        tileId, dispatcher, appServices, ut, theme, widthFract, conf, isBusy,
        queryMatches, queryType
    }:TileFactoryArgs<SyntacticCollsVsTextTypesTileConf>) {
        this.tileId = tileId;
        this.dispatcher = dispatcher;
        this.appServices = appServices;
        this.widthFract = widthFract;

        this.label = appServices.importExternalMessage(conf.label || 'syntactic_colls__main_label');
        this.model = new SyntacticCollsVsTTModel({
            dispatcher: dispatcher,
            tileId: tileId,
            appServices: appServices,
            queryType: queryType,
            maxItems: conf.maxItems,
            theme,
            api: new WSServerSyntacticCollsTTAPI(conf.apiURL, conf.useDataStream, appServices, conf.backlink),
            eApi: new SyntacticCollsExamplesAPI(conf.eApiURL, appServices, conf.attrNames),
            initState: {
                corpname: conf.corpname,
                scollType: 'mixed', // TODO
                queryMatch: findCurrQueryMatch(queryMatches[0]),
                data: List.map(
                    tt => ({
                        id: tt.id,
                        data: {
                            rows: [],
                            examplesQueryTpl: undefined
                        },
                        label: appServices.importExternalMessage(tt.label)
                    }),
                    conf.textTypes
                ),
                examplesCache: {},
                exampleWindowData: undefined,
                isBusy: false,
                error: undefined
            }
        });
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

    supportsQueryType(qt:QueryType, translatLang?:string):boolean {
        return qt === QueryType.SINGLE_QUERY;
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

    supportsSVGFigureSave():boolean {
        return false;
    }

    getAltViewIcon():AltViewIconProps {
        return {
            baseImg: 'wcloud-view.svg',
            highlightedImg: 'wcloud-view_s.svg',
            inlineCss: {width: '2.2em'}
        };
    }

    registerReloadModel(model:ITileReloader):boolean {
        model.registerModel(this, this.model);
        return true;
    }

    supportsMultiWordQueries():boolean {
        return false;
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

export const init:TileFactory<SyntacticCollsVsTextTypesTileConf> = {
    sanityCheck: (args) => [],
    create: (args) => new SyntacticCollsVsTextTypesTile(args)
};
