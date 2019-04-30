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

import * as Immutable from 'immutable';
import { ViewUtils } from 'kombo';
import { Observable } from 'rxjs';

import { GlobalComponents } from '../views/global';


export interface AvailableLanguage {
    code:string;
    label:string;
}

export type ToolbarView = React.ComponentClass<{
    languages:Immutable.List<AvailableLanguage>;
    uiLang:string;
    returnUrl:string;
}>;

export interface HostPageEnv {
    styles:Array<string>;
    scripts:Array<string>;
    html:string|ToolbarView|null;
    toolbarHeight:string|null; // a CSS value
}

export interface IToolbarProvider {
    get(uiLang:string, returnUrl:string, ut:ViewUtils<GlobalComponents>):Observable<HostPageEnv|null>;
}


export interface ScreenProps {
    isMobile:boolean;
    innerWidth:number;
    innerHeight:number;
}