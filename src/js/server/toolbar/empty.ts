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
import { Observable, of as rxOf } from 'rxjs';

import { HostPageEnv, IToolbarProvider } from '../../page/hostPage';
import { ViewUtils } from 'kombo';
import { GlobalComponents } from '../../views/global';



export const emptyValue = ():HostPageEnv => {
    return {
        styles: [],
        scripts: [],
        html: null,
        toolbarHeight: null
    };
}

export class EmptyToolbar implements IToolbarProvider {
    get(uiLang:string, returnUrl:string, cookies:{[key:string]:string}, ut:ViewUtils<GlobalComponents>):Observable<HostPageEnv> {
        return rxOf(emptyValue());
    }

    importLangCode(uiLang:string):string {
        return uiLang;
    }

    exportLangCode(uiLang:string, avail:{[code:string]:string}):string {
        return uiLang;
    }

    defaultHostLangCode():string {
        return 'en-US';
    }
}