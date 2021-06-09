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
import { pipe, Dict, List, tuple } from 'cnc-tskit';

import { IQueryLog } from '../queryLog/abstract';
import { HTTPAction } from './actions';
import { UserConf, ClientConf, ColorThemeIdent } from '../../conf';
import { Observable } from 'rxjs';
import { Request } from 'express';
import { encodeArgs } from '../../page/ajax';
import { Services } from '../actionServices';
import { ViewUtils } from 'kombo';
import { GlobalComponents } from '../../views/global';
import { AppServices } from '../../appServices';
import { LayoutProps } from '../../views/layout';
import { HostPageEnv } from '../../page/hostPage';
import { RecognizedQueries } from '../../query/index';
import { WdglanceMainProps } from '../../views/main';
import { ErrPageProps } from '../../views/error';
import { TileGroup } from '../../page/layout';

/**
 * Obtain value (or values if a key is provided multiple times) from
 * a URL query string as stored in the 'req' argument.
 */
export function getQueryValue(req:Request, name:string, dflt?:string):Array<string> {
    // here we use the 'simple' query string parser so we don't need those
    // fancy crazy types provided by @type/express
    // see https://nodejs.org/api/querystring.html
    const val = (req.query as {[k:string]:string|Array<string>})[name];
    if (typeof val === 'string') {
        return [val];

    } else if (Array.isArray(val)) {
        return List.map(v => v + '', val);
    }
    return typeof dflt !== 'undefined' ? [dflt] : [];
}


export function getQueryParam(req:Request, name:string, dflt?:string):Array<string> {
    // we assume `--` as parameter separator
    const val = req.params[name];
    if (typeof val === 'string') {
        return val.split('--');
    }

    return typeof dflt !== 'undefined' ? [dflt] : [];
}


export function getLangFromCookie(req:Request, services:Services):string {
    const cookieName = services.serverConf.langCookie?.name;
    const ans = cookieName && req.cookies[cookieName] ? req.cookies[cookieName] : services.toolbar.defaultHostLangCode();
    return services.toolbar.exportLangCode(ans, services.serverConf.languages);
}

/**
 * This is only for overview purposes (logging) as the information is far from reliable.
 * To enable/disable features, WaG relies only on client-side detection.
 * @param req
 */
export function clientIsLikelyMobile(req:Request):boolean {
    return req.headers['user-agent'].includes('mobile') || req.headers['user-agent'].includes('iphone') ||
        req.headers['user-agent'].includes('tablet') || req.headers['user-agent'].includes('android');
}

export function logRequest(logging:IQueryLog, datetime:string, req:Request, userConfig:UserConf):Observable<number> {
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
            query1Domain: userConfig.query1Domain,
            query2Domain: userConfig.query2Domain ? userConfig.query2Domain : null,
            query: userConfig.queries,
            error: userConfig.error ? userConfig.error.join(': ') : null
        },
        pid: -1,
        settings: {}
    })
}

export function fetchReqArgArray(req:Request, arg:string, minLen:number):Array<string> {

    const mkEmpty = (len:number) => {
        const ans:Array<string> = [];
        for (let i = 0; i < len; i += 1) {
            ans.push('');
        }
        return ans;
    }

    const values = getQueryValue(req, arg);
    if (Array.isArray(values)) {
        return values.concat(mkEmpty(minLen - values.length));
    }
    return mkEmpty(minLen);
}


export function fetchUrlParamArray(req:Request, param:string, minLen:number):Array<string> {

    const mkEmpty = (len:number) => {
        const ans:Array<string> = [];
        for (let i = 0; i < len; i += 1) {
            ans.push('');
        }
        return ans;
    }

    const values = getQueryParam(req, param);
    if (Array.isArray(values)) {
        return values.concat(mkEmpty(minLen - values.length));
    }
    return mkEmpty(minLen);
}


export function mkPageReturnUrl(req:Request, rootUrl:string):string {
    const args = Dict.filter((_ ,k) => k !== 'uiLang', req.query);
    return rootUrl.replace(/\/$/, '') +
        req.path +
        (req.query && Dict.keys(args).length > 0 ? '?' + encodeArgs(args) : '');
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
            domainNames: pipe(
                services.clientConf.searchDomains,
                Dict.keys(),
                List.map(k => tuple(k, services.clientConf.searchDomains[k]))
            ),
            translator: viewUtils,
            staticUrlCreator: viewUtils.createStaticUrl,
            actionUrlCreator: viewUtils.createActionUrl,
            dataReadability: {metadataMapping: {}, commonStructures: {}},
            apiHeadersMapping: services.clientConf.apiHeaders || {},
            mobileModeTest: ()=>false
        })
    ]
}


interface RenderResultArgs {
    view:React.FC<LayoutProps>;
    services:Services;
    toolbarData:HostPageEnv;
    queryMatches:RecognizedQueries;
    userConfig:UserConf;
    clientConfig:ClientConf;
    returnUrl:string;
    themes:Array<ColorThemeIdent>;
    currTheme:string;
    rootView:React.FC<WdglanceMainProps>|React.FC<ErrPageProps>;
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
        queryMatches,
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
                queryMatches: queryMatches,
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
                error,
                issueReportingUrl: clientConfig.issueReportingUrl
            }
        )
    );
    return `<!DOCTYPE html>\n${appString}`;
}
