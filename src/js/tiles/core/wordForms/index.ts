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

import { ITileProvider, TileFactory, TileComponent, TileConf, TileFactoryArgs,
    DEFAULT_ALT_VIEW_ICON, ITileReloader, AltViewIconProps} from '../../../page/tile.js';
import { IAppServices } from '../../../appServices.js';
import { WordFormsModel } from './model.js';
import { QueryType } from '../../../query/index.js';
import { init as viewInit } from './views.js';
import { CoreApiGroup } from '../../../api/coreGroups.js';
import { MQueryWordFormsAPI } from './api/mquery.js';
import { IWordFormsApi } from './common.js';
import { FrodoWordFormsAPI } from './api/frodo.js';
import { validatePosQueryGenerator } from '../../../conf/validation.js';


export interface WordFormsTileConf extends TileConf {
    apiType:string;
    apiURL:string;
    corpname:string;
    corpusSize:number;
    freqFilterAlphaLevel:Maths.AlphaLevel;
    posQueryGenerator:[string, string];
}


export class WordFormsTile implements ITileProvider {

    private readonly tileId:number;

    private readonly label:string;

    private readonly appServices:IAppServices;

    private readonly model:WordFormsModel;

    private readonly widthFract:number;

    private readonly view:TileComponent;

    constructor({
        tileId, dispatcher, appServices, ut, queryMatches, widthFract, conf, isBusy,
        theme, mainPosAttr}:TileFactoryArgs<WordFormsTileConf>
    ) {

        this.tileId = tileId;
        this.appServices = appServices;
        this.widthFract = widthFract;
        this.label = this.appServices.importExternalMessage(conf.label || 'wordforms__main_label');
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
            api: this.createApi(conf, appServices),
            queryMatches,
            appServices,
        });
        this.view = viewInit(dispatcher, ut, theme, this.model);
    }

    private createApi(conf:WordFormsTileConf, appServices:IAppServices):IWordFormsApi {
        switch (conf.apiType) {
            case CoreApiGroup.MQUERY:
                return new MQueryWordFormsAPI(conf.apiURL, appServices, conf.posQueryGenerator, conf.backlink);
            case CoreApiGroup.FRODO:
                return new FrodoWordFormsAPI(conf.apiURL, appServices, conf.posQueryGenerator, conf.backlink);
            case CoreApiGroup.KORPUS_DB:
            default:
                throw new Error(`Unsupported API type: ${conf.apiType}`);
        }
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

    supportsQueryType(qt:QueryType, translatLang?:string):boolean {
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
        return null;
    }

    hideOnNoData():boolean {
        return false;
    }
}

export const init:TileFactory<WordFormsTileConf> = {

    sanityCheck: (args) => {
        const err = validatePosQueryGenerator(args.conf.posQueryGenerator);
        if (err !== null) {
            return [err];
        }
    },

    create: (args) => new WordFormsTile(args)
};
