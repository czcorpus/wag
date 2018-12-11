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


export class TTDistTile implements ITileProvider {

    private readonly dispatcher:ActionDispatcher;

    private readonly ut:ViewUtils<{}>;

    private readonly mainForm:WdglanceMainFormModel;

    private readonly model:TTDistribModel;

    constructor(dispatcher:ActionDispatcher, ut:ViewUtils<{}>, mainForm:WdglanceMainFormModel) {
        this.dispatcher = dispatcher;
        this.ut = ut;
        this.mainForm = mainForm;
        this.model = new TTDistribModel(this.dispatcher, new DummyAPI(), {});
    }

    init():void {

    }

    getView():React.ComponentClass {
        const c = viewInit(this.dispatcher, this.ut, this.model);
        return c.View;
    }

}


export const init = (dispatcher:ActionDispatcher, ut:ViewUtils<{}>, mainForm:WdglanceMainFormModel) => {
    return new TTDistTile(dispatcher, ut, mainForm);
}