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

import { ITileProvider } from '../../abstract/types';
import {init as viewInit} from './views';
import { ConcordanceTileModel } from './model';
import { ActionDispatcher, ViewUtils } from 'kombo';
import { RequestBuilder } from './service';
import { WdglanceMainFormModel } from '../../models/main';
import { AppServices } from '../../appServices';
import { GlobalComponents } from '../../views/global';

declare var require:any;
require('./style.less');


export interface ConcordanceBoxConf {
    apiURL:string;
}


export interface ConcordanceBoxInitArgs {
    dispatcher:ActionDispatcher;
    appServices:AppServices;
    ut:ViewUtils<GlobalComponents>;
    mainForm:WdglanceMainFormModel;
    conf:ConcordanceBoxConf;
}


export class ConcordanceBox implements ITileProvider {

    private dispatcher:ActionDispatcher;

    private model:ConcordanceTileModel;

    private ut:ViewUtils<GlobalComponents>;

    constructor({dispatcher, appServices, ut, mainForm, conf}:ConcordanceBoxInitArgs) {
        this.dispatcher = dispatcher;
        this.model = new ConcordanceTileModel(
            dispatcher,
            appServices,
            new RequestBuilder(conf.apiURL),
            mainForm
        );
        this.ut = ut;
    }

    init():void {
    }

    getView():React.ComponentClass {
        const c = viewInit(this.dispatcher, this.ut, this.model);
        return c.ConcordanceTileView;
    }

    getLabel():string {
        return this.ut.translate('concordance__main_label');
    }

    supportsSingleWordQuery(language:string):boolean {
        return true; // TODO
    }

    supportsTwoWordQuery(language1:string, language2:string):boolean {
        return true; // TODO
    }
}

export const init = ({dispatcher, appServices, ut, mainForm, conf}:ConcordanceBoxInitArgs) => {
    return new ConcordanceBox({dispatcher, appServices, ut, mainForm, conf});
}