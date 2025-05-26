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
import { ServerStyleSheet } from 'styled-components'
import { Request } from 'express';
import { ViewUtils } from 'kombo';

import { UserConf, ClientConf, ColorThemeIdent } from '../../conf/index.js';
import { encodeArgs } from '../../page/ajax.js';
import { Services } from '../actionServices.js';
import { GlobalComponents } from '../../views/common/index.js';
import { AppServices } from '../../appServices.js';
import { HtmlBodyProps, HtmlHeadProps} from '../../views/layout/layout.js';
import { HostPageEnv } from '../../page/hostPage.js';
import { RecognizedQueries } from '../../query/index.js';
import { WdglanceMainProps } from '../../views/main.js';
import { ErrPageProps } from '../../views/error.js';
import { TileGroup } from '../../page/layout.js';
import { DataStreaming } from '../../page/streaming.js';

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
        staticUrlCreator: (path) => services.clientConf.runtimeAssetsUrl + path,
        actionUrlCreator: (path, args) => services.clientConf.hostUrl +
                (path.substr(0, 1) === '/' ? path.substr(1) : path ) +
                (Object.keys(args || {}).length > 0 ? '?' + encodeArgs(args) : '')
    });

    return [
        viewUtils,
        new AppServices({
            notifications: null, // TODO
            uiLang: uiLang,
            translator: viewUtils,
            staticUrlCreator: viewUtils.createStaticUrl,
            actionUrlCreator: viewUtils.createActionUrl,
            dataReadability: {metadataMapping: {}, commonStructures: {}},
            dataStreaming: new DataStreaming(null, [], undefined, 1000, undefined),
            apiHeadersMapping: services.clientConf.apiHeaders || {},
            mobileModeTest: ()=>false
        })
    ]
}

/**
 * DummyStyleSheet is a replacement for ServerStyleSheet when in development mode.
 * This allows using dynamic style generation with live code reloading.
 */
class DummyStyleSheet {

    collectStyles(elm:React.ReactElement):React.ReactElement {
        return elm;
    }

    seal():void {}

    getStyleElement():Array<React.ReactElement> {
        return [];
    }
}


interface RenderResultArgs {
    HtmlBody:React.FC<HtmlBodyProps>;
    HtmlHead:React.FC<HtmlHeadProps>;
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
    htmlTitle?:string;
    layout:Array<TileGroup>;
    isMobile:boolean;
    isAnswerMode:boolean;
    version:string;
    repositoryUrl:string;
    error?:[number, string];
}


export function renderResult({
        HtmlBody,
        HtmlHead,
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
        htmlTitle,
        homepageSections,
        version,
        services,
        repositoryUrl,
        error}:RenderResultArgs):string {

    const sheet = process.env['NODE_ENV'] === 'production' ?
        new ServerStyleSheet() :
        new DummyStyleSheet();
    try {
        const bodyString = renderToString(
            sheet.collectStyles(
                React.createElement<HtmlBodyProps>(
                    HtmlBody,
                    {
                        config: clientConfig,
                        userConfig,
                        hostPageEnv: toolbarData,
                        queryMatches: queryMatches,
                        uiLanguages: pipe(
                            userConfig.uiLanguages,
                            Dict.mapEntries(([code, label]) => ({code, label})),
                            List.map(([,v]) => v)
                        ),
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
                        scriptNonce: services.scriptNonce,
                        issueReportingUrl: clientConfig.issueReportingUrl
                    }
                )
            )
        );
        const headString = renderToString(
            React.createElement<HtmlHeadProps>(
                HtmlHead,
                {
                    hostPageEnv: toolbarData,
                    config: clientConfig,
                    scStyles: sheet.getStyleElement(),
                    htmlTitle: htmlTitle,
                }
            )
        );
        return `<!DOCTYPE html>\n<html lang=${userConfig.uiLang}>\n${headString}\n${bodyString}</html>`;

    } finally {
        sheet.seal();
    }
}