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

import * as Immutable from 'immutable';
import { ITileProvider, TileComponent, QueryType, TileConf, TileFactory } from '../../common/types';
import { TreqSubsetModel, TranslationSubset } from './model';
import { TreqAPI, TreqTranslation } from '../../common/api/treq';
import {init as viewInit} from './view';

declare var require:any;
require('./style.less');


export interface TreqSubsetsTileConf extends TileConf {
    tileType:'TreqSubsetsTile';
    srchPackages:{[lang:string]:Array<string>};
    apiURL:string;
}


export class TreqSubsetsTile implements ITileProvider {

    private readonly tileId:number;

    private readonly widthFract:number;

    private readonly model:TreqSubsetModel;

    private readonly view:TileComponent;

    private readonly label:string;

    constructor({tileId, dispatcher, appServices, theme, ut, lang1, lang2, mainForm, widthFract, conf}:TileFactory.Args<TreqSubsetsTileConf>) {
        this.tileId = tileId;
        this.widthFract = widthFract;
        this.model = new TreqSubsetModel(
            dispatcher,
            {
                lang1: lang1,
                lang2: lang2,
                isBusy: false,
                isAltViewMode: false,
                error: null,
                subsets: Immutable.List<TranslationSubset>(conf.srchPackages[lang2].map(v => ({
                    ident: v,
                    label: v,
                    translations: Immutable.List<TreqTranslation>(),
                    packages: Immutable.List<string>([v]),
                    isPending: false
                }))),
                highlightedRowIdx: -1
            },
            tileId,
            new TreqAPI(conf.apiURL),
            mainForm
        );
        this.label = appServices.importExternalMessage(conf.label || 'treqsubsets__main_label');
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

    /**
     */
    supportsQueryType(qt:QueryType, lang1:string, lang2?:string):boolean {
        return qt === QueryType.TRANSLAT_QUERY;
    }

    disable():void {
        // TODO
    }

    getWidthFract():number {
        return this.widthFract;
    }

    supportsTweakMode():boolean {
        return false;
    }

    supportsHelpView():boolean {
        return true;
    }

    supportsAltView():boolean {
        return true;
    }

}


export const init:TileFactory.TileFactory<TreqSubsetsTileConf> = (args) => new TreqSubsetsTile(args);