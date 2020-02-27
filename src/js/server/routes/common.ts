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
import { renderToString } from 'react-dom/server';
import * as React from 'react';

import { ILogQueue } from '../logging/abstract';
import { HTTPAction } from './actions';
import { UserConf, ClientConf, ColorThemeIdent } from '../../conf';
import { Observable } from 'rxjs';
import { Request } from 'express';
import { encodeArgs } from '../../common/ajax';
import { Services } from '../actionServices';
import { ViewUtils } from 'kombo';
import { GlobalComponents } from '../../views/global';
import { AppServices } from '../../appServices';
import { pipe, Dict, List } from 'cnc-tskit';
import { LayoutProps } from '../../views/layout';
import { HostPageEnv } from '../../common/hostPage';
import { RecognizedQueries } from '../../common/query';
import { WdglanceMainProps } from '../../views/main';
import { ErrPageProps } from '../../views/error';
import { TileGroup } from '../../layout';


export function getLangFromCookie(req:Request, cookieName:string, languages:{[code:string]:string}):string {
    const ans = req.cookies[cookieName] || 'en-US';
    if (languages.hasOwnProperty(ans)) {
        return ans;

    } else {
        const srch = Object.keys(languages).find(k => k.split('-')[0] === ans.split('-')[0]);
        return srch ? srch : 'en-US';
    }
}

export function logRequest(logging:ILogQueue, datetime:string, req:Request, userConfig:UserConf):Observable<number> {
    return logging.put({
        user_id: 1,
        proc_time: -1,
        date: datetime,
        action: HTTPAction.SEARCH,
        request: {
            HTTP_X_FORWARDED_FOR: req.headers.forwarded,
            HTTP_USER_AGENT: req.headers['user-agent'],
            HTTP_REMOTE_ADDR: null,
            REMOTE_ADDR: req.connection.remoteAddress
        },
        params: {
            uiLang: userConfig.uiLang,
            queryType: userConfig.queryType,
            query1Lang: userConfig.query1Lang,
            query2Lang: userConfig.query2Lang ? userConfig.query2Lang : null,
            queryPos: userConfig.queryPos ? userConfig.queryPos.map(v => v.join(',')) : null,
            query: userConfig.queries,
            error: userConfig.error ? userConfig.error.join(': ') : null
        },
        pid: -1,
        settings: {}
    })
}

export function fetchReqArgArray<T extends string>(req:Request, arg:string, minLen:number):Array<T> {

    const mkEmpty = (len:number) => {
        const ans = [];
        for (let i = 0; i < len; i += 1) {
            ans.push('');
        }
        return ans;
    }

    if (Array.isArray(req.query[arg])) {
        return req.query[arg].concat(mkEmpty(minLen - req.query[arg].length));

    } else if (req.query[arg]) {
        return [req.query[arg]].concat(mkEmpty(minLen - 1));
    }
    return mkEmpty(minLen);
}


export function mkReturnUrl(req:Request, rootUrl:string):string {
    return rootUrl.replace(/\/$/, '') +
        req.path +
        (req.query && Object.keys(req.query).length > 0 ? '?' + encodeArgs(req.query) : '');
}


export function createHelperServices(services:Services, uiLang:string):[ViewUtils<GlobalComponents>, AppServices] {
    const viewUtils = new ViewUtils<GlobalComponents>({
        uiLang: uiLang,
        translations: services.translations,
        staticUrlCreator: (path) => services.clientConf.rootUrl + 'assets/' + path,
        actionUrlCreator: (path, args) => services.clientConf.hostUrl +
                (path.substr(0, 1) === '/' ? path.substr(1) : path ) +
                (Object.keys(args || {}).length > 0 ? '?' + encodeArgs(args) : '')
    });

    return [
        viewUtils,
        new AppServices({
            notifications: null, // TODO
            uiLang: uiLang,
            searchLanguages: Object.keys(services.clientConf.searchLanguages).map(k => [k, services.clientConf.searchLanguages[k]]),
            translator: viewUtils,
            staticUrlCreator: viewUtils.createStaticUrl,
            actionUrlCreator: viewUtils.createActionUrl,
            dbValuesMapping: services.clientConf.dbValuesMapping || {},
            apiHeadersMapping: services.clientConf.apiHeaders || {},
            mobileModeTest: ()=>false
        })
    ]
}


interface RenderResultArgs {
    view:React.SFC<LayoutProps>;
    services:Services;
    toolbarData:HostPageEnv;
    lemmas:RecognizedQueries;
    userConfig:UserConf;
    clientConfig:ClientConf;
    returnUrl:string;
    themes:Array<ColorThemeIdent>;
    currTheme:string;
    rootView:React.ComponentType<WdglanceMainProps|ErrPageProps>;
    homepageSections:Array<{label:string; html:string}>;
    layout:Array<TileGroup>;
    isMobile:boolean;
    isAnswerMode:boolean;
    version:string;
    repositoryUrl:string;
    error?:[number, string];
}


export function renderResult({
        view,
        toolbarData,
        lemmas,
        userConfig,
        clientConfig,
        returnUrl,
        currTheme,
        themes,
        rootView,
        layout,
        isMobile,
        isAnswerMode,
        homepageSections,
        version,
        repositoryUrl,
        error}:RenderResultArgs):string {

    const appString = renderToString(
        React.createElement<LayoutProps>(
            view,
            {
                config: clientConfig,
                userConfig,
                hostPageEnv: toolbarData,
                lemmas: lemmas,
                uiLanguages: pipe(userConfig.uiLanguages, Dict.mapEntries(v => v), List.map(([k, v]) => ({code: k, label: v}))),
                uiLang: userConfig.uiLang,
                returnUrl,
                currTheme,
                themes,
                homepageTiles: [...clientConfig.homepage.tiles],
                RootComponent: rootView,
                layout,
                homepageSections,
                isMobile,
                isAnswerMode,
                version,
                repositoryUrl,
                error
            }
        )
    );
    return `<!DOCTYPE html>\n${appString}`;
}