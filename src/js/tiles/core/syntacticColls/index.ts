/*
 * Copyright 2023 Martin Zimandl <martin.zimandl@gmail.com>
 * Copyright 2025 Tomas Machalek <tomas.machalek@gmail.com>
 * Copyright 2023 Institute of the Czech National Corpus,
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
import { findCurrQueryMatch, QueryMatch, QueryType } from '../../../query/index.js';
import { SyntacticCollsModel } from './model.js';
import { init as viewInit } from './views.js';
import { TileConf, ITileProvider, TileComponent, TileFactory, TileFactoryArgs, ITileReloader, AltViewIconProps } from '../../../page/tile.js';
import { ScollexSyntacticCollsAPI } from './api/scollex.js';
import { WSServerSyntacticCollsAPI } from './api/wsserver.js';
import { deprelValues } from './deprel.js';
import { LocalizedConfMsg } from '../../../types.js';
import { List, pipe, tuple } from 'cnc-tskit';
import { SCollsQueryType } from './api/common.js';
import { AttrNamesConf, SyntacticCollsExamplesAPI } from './eApi/mquery.js';


export interface DisplayTypeConf {
    displayType:SCollsQueryType;
    supportedPos:'any'|Array<string>;
    label:LocalizedConfMsg;
}


export interface SyntacticCollsTileConf extends TileConf {
    apiURL:string;
    apiType?:'default'|'wss';
    eApiURL:string;
    corpname:string;
    maxItems:number;
    hideOnNoData?:boolean;
    displayTypes:Array<DisplayTypeConf>;
    attrNames:AttrNamesConf;
}


function findQueryHandler(configs:Array<DisplayTypeConf>, qm:QueryMatch):DisplayTypeConf|null {

    const posMatches = (v:string, queryMatch:QueryMatch) => {
        const pos = pipe(
            queryMatch.pos || [],
            List.concat(queryMatch.upos || []),
            List.filter(v => !!v.value),
            List.map(x => x.value),
            x => x.join(' ')
        ).toLowerCase();
        return pos === v.toLowerCase();
    };

    const matchingHandlers = pipe(
        configs,
        List.sorted(
            (v1, v2) => {
                if (Array.isArray(v1.supportedPos) && !Array.isArray(v2.supportedPos)) {
                    return -1;
                }
                if (!Array.isArray(v1.supportedPos) && Array.isArray(v2.supportedPos)) {
                    return 1;
                }
                return 0;
            }
        ),
        List.filter(
            v => {
                if (Array.isArray(v.supportedPos)) {
                    return !!List.find(item => posMatches(item, qm), v.supportedPos);

                } else if (v.supportedPos === 'any') {
                    return true;
                }
                return false;
            }
        ),
    );
    if (!List.empty(matchingHandlers)) {
        return List.head(matchingHandlers);
    }
    return null;
}

/**
 *
 */
export class SyntacticCollsTile implements ITileProvider {

    private readonly tileId:number;

    private readonly dispatcher:IActionDispatcher;

    private readonly appServices:IAppServices;

    private readonly model:SyntacticCollsModel;

    private readonly widthFract:number;

    private readonly label:string;

    private readonly apiType:'default'|'wss';

    private readonly displayType:DisplayTypeConf;

    private readonly _hideOnNoData:boolean;

    private view:TileComponent;

    constructor({
        tileId, dispatcher, appServices, ut, theme, widthFract, conf, isBusy,
        queryMatches, queryType
    }:TileFactoryArgs<SyntacticCollsTileConf>) {
        this.tileId = tileId;
        this.dispatcher = dispatcher;
        this.appServices = appServices;
        this.widthFract = widthFract;
        this.apiType = conf.apiType;
        this._hideOnNoData = conf.hideOnNoData !== undefined ? !!conf.hideOnNoData : true;

        const currQueryMatch = findCurrQueryMatch(queryMatches[0]);
        this.displayType = findQueryHandler(conf.displayTypes, currQueryMatch);

        this.model = new SyntacticCollsModel({
            dispatcher: dispatcher,
            tileId: tileId,
            appServices: appServices,
            queryType: queryType,
            maxItems: conf.maxItems,
            api: conf.apiType === 'wss' ?
                new WSServerSyntacticCollsAPI(conf.apiURL, conf.useDataStream, appServices, conf.backlink) :
                new ScollexSyntacticCollsAPI(conf.apiURL, conf.useDataStream, appServices, conf.backlink),
            eApi: new SyntacticCollsExamplesAPI(conf.eApiURL, appServices, conf.attrNames),
            initState: {
                isBusy: isBusy,
                isMobile: appServices.isMobileMode(),
                isAltViewMode: false,
                isTweakMode: false,
                tileId: tileId,
                apiType: conf.apiType || 'default',
                widthFract: widthFract,
                error: null,
                corpname: conf.corpname,
                queryMatch: findCurrQueryMatch(queryMatches[0]),
                data: null,
                visibleMeasures: tuple('LL', 'LMI'),
                displayType: this.displayType ? this.displayType.displayType : 'none',
                label: this.displayType ? appServices.importExternalMessage(this.displayType.label) : null,
                examplesCache: {},
                exampleWindowData: undefined,
                deprelValues,
                srchWordDeprelFilter: ''
            }
        });
        this.label = appServices.importExternalMessage(conf.label || 'syntactic_colls__main_label');
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
        return this.apiType === 'wss';
    }

    supportsAltView():boolean {
        return true;
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
        return this._hideOnNoData;
    }
}

export const init:TileFactory<SyntacticCollsTileConf> = {
    sanityCheck: (args) => [],
    create: (args) => new SyntacticCollsTile(args)
};
