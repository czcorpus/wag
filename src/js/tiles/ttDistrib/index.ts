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

import { ITileProvider } from "../../abstract/types";
import {init as viewInit} from './views/main';
import { ActionDispatcher, ViewUtils } from "kombo";
import { WdglanceMainFormModel } from "../../models/main";
import { TTDistribModel } from "./model";
import { DummyAPI } from "./api";
import { GlobalComponents } from "../../views/global";


export class TTDistTile implements ITileProvider {

    private readonly dispatcher:ActionDispatcher;

    private readonly ut:ViewUtils<GlobalComponents>;

    private readonly mainForm:WdglanceMainFormModel;

    private readonly model:TTDistribModel;

    constructor(frameId:number, dispatcher:ActionDispatcher, ut:ViewUtils<GlobalComponents>, mainForm:WdglanceMainFormModel) {
        this.dispatcher = dispatcher;
        this.ut = ut;
        this.mainForm = mainForm;
        this.model = new TTDistribModel(this.dispatcher, frameId, new DummyAPI(), mainForm, {});
    }

    init():void {

    }

    getView():React.ComponentClass {
        const c = viewInit(this.dispatcher, this.ut, this.model);
        return c.View;
    }

    getLabel():string {
        return this.ut.translate('ttDistrib__main_label');
    }

}


export const init = (frameId:number, dispatcher:ActionDispatcher, ut:ViewUtils<GlobalComponents>, mainForm:WdglanceMainFormModel) => {
    return new TTDistTile(frameId, dispatcher, ut, mainForm);
}