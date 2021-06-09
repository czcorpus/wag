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

import { ViewUtils } from 'kombo';
import { Observable } from 'rxjs';

import { GlobalComponents } from '../views/global';


export interface AvailableLanguage {
    code:string;
    label:string;
}

export type ToolbarView = React.ComponentClass<{
    languages:Array<AvailableLanguage>;
    uiLang:string;
    returnUrl:string;
}>;

export interface HostPageEnv {
    styles:Array<string>;
    scripts:Array<string>;
    html:string|ToolbarView|null;
    toolbarHeight:string|null; // a CSS value
    userId:number;
}

export interface IToolbarProvider {

    /**
     *
     * @param uiLang Current language of the user interface
     * @param returnUrl Current action address; this allows toolbar links/functions to leave wdglance and then return
     * @param cookies Current cookies for wdglance
     * @param ut view utils
     */
    get(uiLang:string, returnUrl:string, cookies:{[key:string]:string}, ut:ViewUtils<GlobalComponents>):Observable<HostPageEnv|null>;

    /**
     * Import WaG language code into a host environment one
     * (e.g. "en-US" -> "en" in case the environment uses two letter format).
     */
    importLangCode(uiLang:string):string;

    /**
     * Export host environment language code into WaG one
     * (.e.g. "en" --> "en-US")
     */
    exportLangCode(uiLang:string, avail:{[code:string]:string}):string;

    defaultHostLangCode():string;
}


export interface ScreenProps {
    isMobile:boolean;
    innerWidth:number;
    innerHeight:number;
}