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

import { IToolbarProvider } from '../../page/hostPage.js';
import { EmptyToolbar } from './empty.js';
import { LangSwitchToolbar } from './langSwitch.js';
import { UCNKToolbar } from './ucnk.js';
import { ToolbarDef } from '../../conf/index.js';


export enum ToolbarType {
    EMPTY = 'empty',
    UCNK = 'ucnk',
    LANG_SWITCH = 'langSwitch'
}

export function createToolbarInstance(conf:ToolbarDef):IToolbarProvider {

    switch (conf.type) {
        case ToolbarType.EMPTY:
            return new EmptyToolbar();
        case ToolbarType.LANG_SWITCH:
            return new LangSwitchToolbar();
        case ToolbarType.UCNK:
            return new UCNKToolbar(conf.url);
        default:
            throw new Error(`Unknown toolbar type [${conf.type}]`);
    }

}