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

//
// This module contains a customized toolbar as needed
// by CNC integration guidelines. For general use, please
// look at the 'langSwitch' toolbar.

import { Observable } from 'rxjs';

import { HostPageEnv, IToolbarProvider } from '../../page/hostPage';
import { GlobalComponents } from '../../views/global';
import { ViewUtils } from 'kombo';
import { serverHttpRequest, ServerHTTPRequestError } from '../request';
import { HTTP, pipe, Dict, List } from 'cnc-tskit';
import { map, catchError } from 'rxjs/operators';


interface ToolbarResponse {
    user:any; // TODO

    styles:{
        [ident:string]:{
            package:string;
            module:string;
            version:string;
            url:string;
        }
    };

    scripts:{
        main:string;
        depends:{
            [ident:string]:{
                package:string;
                module:string;
                version:string;
                url:string;
            }
        };
    }

    html:string;
}


export class UCNKToolbar implements IToolbarProvider {

    private readonly url:string;

    private static readonly PREFIX = 'cnc_toolbar_';

    private static readonly PASS_ARGS = [
        'cnc_toolbar_sid',
        'cnc_toolbar_at',
        'cnc_toolbar_rmme',
        'cnc_toolbar_lang'
    ];

    private static readonly TOOLBAR_APP_IDENT = 'wag';

    constructor(url:string) {
        this.url = url;
    }

    get(uiLang:string, returnUrl:string, cookies:{[key:string]:string}, ut:ViewUtils<GlobalComponents>):Observable<HostPageEnv> {
        const data = new URLSearchParams();
        data.set('continue', returnUrl);
        data.set('current', UCNKToolbar.TOOLBAR_APP_IDENT);
        List.forEach(
            arg => {
                data.set(arg.substring(UCNKToolbar.PREFIX.length), cookies[arg] || '');
            },
            UCNKToolbar.PASS_ARGS
        );
        data.set('lang', uiLang.split('-')[0]);

        return serverHttpRequest<ToolbarResponse>({
            url: this.url,
            headers: { 'content-type': 'application/x-www-form-urlencoded' },
            method: HTTP.Method.POST,
            data

        }).pipe(
            catchError(
                (err:Error) => {
                    throw err instanceof ServerHTTPRequestError ?
                        new Error(`Toolbar loading failed with error: ${err.statusText} (code ${err.status})`) :
                        err
                }
            ),
            map<ToolbarResponse, HostPageEnv>(
                response => ({
                    userId: parseInt(response.user.id),
                    styles: pipe(
                        response.styles,
                        Dict.toEntries(),
                        List.sortBy(x => parseInt(x[0])),
                        List.map(v => v[1].url)
                    ),
                    scripts: pipe(
                        response.scripts.depends,
                        Dict.toEntries(),
                        List.sortBy(x => parseInt(x[0])),
                        List.map(v => v[1].url),
                        List.concat([response.scripts.main])
                    ),
                    html: response.html,
                    toolbarHeight: '50px'
                })
            )
        );
    }

    importLangCode(uiLang:string):string {
        return uiLang.split('-')[0];
    }

    exportLangCode(uiLang:string, avail:{[code:string]:string}):string {
        const srch = pipe(avail, Dict.keys(), List.find(v => v.split('-')[0] === uiLang));
        return srch ? srch : this.defaultHostLangCode();
    }

    defaultHostLangCode():string {
        return 'en';
    }
 }