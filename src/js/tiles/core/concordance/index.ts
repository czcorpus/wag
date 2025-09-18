/*
 * Copyright 2018 Tomas Machalek <tomas.machalek@gmail.com>
 * Copyright 2018 Institute of the Czech National Corpus,
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

import { LocalizedConfMsg } from '../../../types.js';
import { findCurrQueryMatch, QueryType } from '../../../query/index.js';
import { AltViewIconProps, CorpSrchTileConf, DEFAULT_ALT_VIEW_ICON, ITileProvider,
    ITileReloader, TileComponent, TileFactory, TileFactoryArgs } from '../../../page/tile.js';
import { ConcordanceTileModel } from './model.js';
import { init as viewInit } from './views.js';
import { MQueryConcApi } from '../../../api/vendor/mquery/concordance/index.js';
import { createInitialLinesData, ViewMode } from '../../../api/vendor/mquery/concordance/common.js';
import { CorpusInfoAPI } from '../../../api/vendor/mquery/corpusInfo.js';
import { PosQueryGeneratorType, validatePosQueryGenerator } from '../../../conf/common.js';


export interface ConcordanceTileConf extends CorpSrchTileConf {
    apiURL:string;
    pageSize:number;
    posAttrs:Array<string>;
    sentenceStruct:string;
    posQueryGenerator:PosQueryGeneratorType; // a positional attribute name and a function name to create a query value (e.g. ['tag', 'ppTagset'])
    parallelLangMapping?:{[lang:string]:string};
    disableViewModes?:boolean;
    metadataAttrs?:Array<{value:string; label:LocalizedConfMsg}>;
}


/**
 *
 */
export class ConcordanceTile implements ITileProvider {

    private readonly tileId:number;

    private readonly dispatcher:IActionDispatcher;

    private readonly model:ConcordanceTileModel;

    private view:TileComponent;

    private readonly widthFract:number;

    private readonly label:string;

    private readonly readDataFromTile:number;

    constructor({
        tileId, dispatcher, appServices, ut, queryType, queryMatches,
        widthFract, conf, isBusy, readDataFromTile
    }:TileFactoryArgs<ConcordanceTileConf>
    ) {
        this.tileId = tileId;
        this.dispatcher = dispatcher;
        this.widthFract = widthFract;
        this.readDataFromTile = readDataFromTile;
        this.model = new ConcordanceTileModel({
            dispatcher: dispatcher,
            tileId,
            readDataFromTile: typeof readDataFromTile === 'number' ? readDataFromTile : null,
            appServices,
            api: new MQueryConcApi(conf.apiURL, appServices, conf.backlink),
            infoApi: new CorpusInfoAPI(
                conf.srcInfoURL ? conf.srcInfoURL : conf.apiURL,
                appServices
            ),
            queryMatches,
            queryType,
            initState: {
                tileId,
                visibleQueryIdx: 0,
                isBusy,
                error: null,
                isTweakMode: false,
                isMobile: appServices.isMobileMode(),
                widthFract: widthFract,
                pageSize: conf.pageSize,
                concordances: createInitialLinesData(queryMatches.length),
                corpname: conf.corpname,
                subcname: Array.isArray(conf.subcname) ? conf.subcname[0] : conf.subcname,
                subcDesc: conf.subcDesc ? appServices.importExternalMessage(conf.subcDesc) : '',
                sentenceStruct: conf.sentenceStruct,
                otherCorpname: null, // TODO change in case aligned conc. are supported
                initialKwicWindow: this.calcContext(widthFract),
                kwicWindow: appServices.isMobileMode() ? ConcordanceTileModel.CTX_SIZES[0] : this.calcContext(widthFract),
                attr_vmode: 'mouseover',
                viewMode: typeof readDataFromTile === 'number' ? ViewMode.SENT : ViewMode.KWIC,
                attrs: conf.posAttrs,
                metadataAttrs: (conf.metadataAttrs || []).map(v => ({value: v.value, label: appServices.importExternalMessage(v.label)})),
                backlinks: List.map(_ => null, queryMatches),
                posQueryGenerator: conf.posQueryGenerator,
                disableViewModes: false, // TODO change in case aligned conc. are supported
                visibleMetadataLine: -1,
                queries: List.map(lemmaGroup => findCurrQueryMatch(lemmaGroup).word, queryMatches),
                isExamplesMode: typeof readDataFromTile === 'number'
            }
        });
        this.label = appServices.importExternalMessage(conf.label || 'concordance__main_label');
        this.view = viewInit(this.dispatcher, ut, this.model);
    }

    private calcContext(widthFract:number|undefined):number {
        return ConcordanceTileModel.CTX_SIZES[widthFract || 0] || ConcordanceTileModel.CTX_SIZES[0];
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

    supportsQueryType(qt:QueryType, translatLang?:string):boolean {
        return qt === QueryType.SINGLE_QUERY || qt === QueryType.TRANSLAT_QUERY || qt === QueryType.CMP_QUERY;
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
        return DEFAULT_ALT_VIEW_ICON;
    }

    registerReloadModel(model:ITileReloader):boolean {
        model.registerModel(this, this.model);
        return true;
    }

    supportsMultiWordQueries():boolean {
        return true;
    }

    getIssueReportingUrl():null {
        return null;
    }

    getReadDataFrom():number|null {
        return this.readDataFromTile;
    }

    hideOnNoData():boolean {
        return false;
    }
}

export const init:TileFactory<ConcordanceTileConf> = {

    sanityCheck: (args) => {
        const message = validatePosQueryGenerator(args.conf.posQueryGenerator);
        if (message) {
            return [new Error(`invalid posQueryGenerator in concordance tile, ${message}`)];
        }
    },

    create: (args) => new ConcordanceTile(args)
}
