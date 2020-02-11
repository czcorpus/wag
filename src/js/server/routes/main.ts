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
import { NextFunction } from 'connect';
import { Request, Response } from 'express';
import * as React from 'react';
import { renderToString } from 'react-dom/server';
import { Observable, forkJoin, of as rxOf } from 'rxjs';
import { concatMap, map, catchError, reduce } from 'rxjs/operators';


import { AppServices } from '../../appServices';
import { HostPageEnv } from '../../common/hostPage';
import { QueryType, LemmaVariant, QueryPoS, matchesPos, findMergeableLemmas, RecognizedQueries, importQueryTypeString } from '../../common/query';
import { UserConf, ClientStaticConf, ClientConf, emptyClientConf, getSupportedQueryTypes, emptyLayoutConf, getQueryTypeFreqDb, DEFAULT_WAIT_FOR_OTHER_TILES } from '../../conf';
import { init as viewInit, LayoutProps } from '../../views/layout';
import { ServerSideActionDispatcher } from '../core';
import { emptyValue } from '../toolbar/empty';
import { Services  } from '../actionServices';
import { getLemmas } from '../freqdb/freqdb';
import { loadFile } from '../files';
import { createRootComponent } from '../../app';
import { WdglanceMainProps } from '../../views/main';
import { TileGroup } from '../../layout';
import { ActionName } from '../../models/actions';
import { DummyCache } from '../../cacheDb';
import { Dict, List, pipe } from '../../common/collections';
import { getLangFromCookie, fetchReqArgArray, createHelperServices, mkReturnUrl, logRequest } from './common';



function mkRuntimeClientConf(conf:ClientStaticConf, lang:string, appServices:AppServices):Observable<ClientConf> {
    return forkJoin(...conf.homepage.tiles.map(item =>
        appServices.importExternalText(
            item.contents,
            loadFile

        ).pipe(
            map<string, {label:string; html: string}>(value => ({
                label: appServices.importExternalMessage(item.label),
                html: value
            }))
        )

    )).pipe(
        map((item:Array<{label:string; html: string}>) => ({
            rootUrl: conf.rootUrl,
            hostUrl: conf.hostUrl,
            favicon: conf.favicon,
            logo: conf.logo,
            corpInfoApiUrl: conf.corpInfoApiUrl,
            apiHeaders: conf.apiHeaders,
            reqCacheTTL: conf.reqCacheTTL,
            onLoadInit: conf.onLoadInit,
            dbValuesMapping: conf.dbValuesMapping,
            colors: conf.colors,
            tiles: typeof conf.tiles === 'string' ?
                {} : // this should not happen at runtime (string has been already used as uri to load a nested conf)
                pipe(
                    conf.tiles[lang],
                    Dict.map(item => ({waitForTimeoutSecs: DEFAULT_WAIT_FOR_OTHER_TILES, ...item}))
                ),
            layouts: Object.assign(emptyLayoutConf(), conf.layouts[lang]),
            searchLanguages: Object.keys(conf.searchLanguages).map(k => ({
                code: k,
                label: conf.searchLanguages[k],
                queryTypes: getSupportedQueryTypes(conf, k)
            })),
            externalStyles: conf.externalStyles || [],
            issueReportingUrl: conf.issueReportingUrl,
            homepage: {
                tiles: item
            },
            telemetry: conf.telemetry
        }))
    );
}


interface RenderResultArgs {
    view:React.SFC<LayoutProps>;
    services:Services;
    toolbarData:HostPageEnv;
    lemmas:RecognizedQueries;
    userConfig:UserConf;
    clientConfig:ClientConf;
    returnUrl:string;
    rootView:React.ComponentType<WdglanceMainProps>;
    homepageSections:Array<{label:string; html:string}>;
    layout:Array<TileGroup>;
    isMobile:boolean;
    isAnswerMode:boolean;
}

function renderResult({view, services, toolbarData, lemmas, userConfig, clientConfig, returnUrl,
        rootView, layout, isMobile, isAnswerMode, homepageSections}:RenderResultArgs):string {
    const appString = renderToString(
        React.createElement<LayoutProps>(
            view,
            {
                config: clientConfig,
                userConfig: userConfig,
                hostPageEnv: toolbarData,
                lemmas: lemmas,
                uiLanguages: pipe(userConfig.uiLanguages, Dict.mapEntries(v => v), List.map(([k, v]) => ({code: k, label: v}))),
                uiLang: userConfig.uiLang,
                returnUrl: returnUrl,
                homepageTiles: [...clientConfig.homepage.tiles],
                RootComponent: rootView,
                layout: layout,
                homepageSections: homepageSections,
                isMobile: isMobile,
                isAnswerMode: isAnswerMode
            }
        )
    );
    return `<!DOCTYPE html>\n${appString}`;
}


export function mainAction(services:Services, answerMode:boolean, req:Request, res:Response, next:NextFunction) {
    // this just ensures backward compatibility
    if (req.url.includes('q1=') || req.url.includes('q2=')) {
        res.redirect(301, mkReturnUrl(req, services.clientConf.rootUrl).replace('q1=', 'q=').replace('q2=', 'q='));
        return;
    }

    const queryType = importQueryTypeString(req.query['queryType'], QueryType.SINGLE_QUERY);
    const minNumQueries = queryType === QueryType.CMP_QUERY ? 2 : 1;

    const userConfig:UserConf = {
        uiLang: getLangFromCookie(req, services.serverConf.langCookie, services.serverConf.languages),
        uiLanguages: services.serverConf.languages,
        query1Lang: req.query['lang1'] || 'cs',
        query2Lang: req.query['lang2'] || 'en',
        queryType: queryType,
        queryPos: fetchReqArgArray(req, 'pos', minNumQueries).map(v => v.split(',') as Array<QueryPoS>),
        queries: fetchReqArgArray(req, 'q', minNumQueries),
        lemma: fetchReqArgArray(req, 'lemma', minNumQueries),
        answerMode: answerMode
    };
    const dispatcher = new ServerSideActionDispatcher();
    const [viewUtils, appServices] = createHelperServices(services, userConfig.uiLang);

    forkJoin({
        userConf: new Observable<UserConf>(
            (observer) => {
                if (userConfig.queryType === QueryType.TRANSLAT_QUERY && userConfig.query1Lang === userConfig.query2Lang) {
                    userConfig.error = appServices.translate('global__src_and_dst_langs_must_be_different');
                }
                observer.next(userConfig);
                observer.complete();
            }
        ),
        hostPageEnv: services.toolbar.get(userConfig.uiLang, mkReturnUrl(req, services.clientConf.rootUrl), req.cookies, viewUtils),
        runtimeConf: mkRuntimeClientConf(services.clientConf, userConfig.query1Lang, appServices),
        logReq: logRequest(
            services.logging,
            appServices.getISODatetime(),
            req,
            userConfig
        ).pipe(catchError(
            (err:Error) => {
                services.errorLog.error(err.message, {trace: err.stack});
                return rxOf(0);
            }
        )),
        lemmasEachQuery: rxOf(...userConfig.queries
                .map(query => answerMode ?
                    getLemmas(
                        services.db.getDatabase(userConfig.queryType, userConfig.query1Lang),
                        appServices,
                        query,
                        getQueryTypeFreqDb(services.serverConf, userConfig.queryType).minLemmaFreq
                    ) :
                    rxOf<Array<LemmaVariant>>([])

                )).pipe(
                    concatMap(v => v),
                    reduce((acc:Array<Array<LemmaVariant>>, curr) => acc.concat([curr]), [])

                )
    }).subscribe(
        ({userConf, hostPageEnv, runtimeConf, logReq, lemmasEachQuery}) => {
            const lemmasExtended = lemmasEachQuery.map((lemmas, queryIdx) => {
                let mergedLemmas = findMergeableLemmas(lemmas);
                if (mergedLemmas.length > 0) {
                    let matchIdx = 0;
                    if (userConf.queryPos[queryIdx]) {
                        const srchIdx = mergedLemmas.findIndex(
                            v => matchesPos(v, userConf.queryPos[queryIdx]) && (v.lemma === userConf.lemma[queryIdx] || !userConf.lemma[queryIdx]));
                        if (srchIdx >= 0) {
                            matchIdx = srchIdx;
                        }
                    }
                    const v = mergedLemmas[matchIdx];
                    mergedLemmas[matchIdx] = {
                        lemma: v.lemma,
                        word: v.word,
                        pos: v.pos.concat([]),
                        abs: v.abs,
                        ipm: v.ipm,
                        arf: v.arf,
                        flevel: v.flevel,
                        isCurrent: true,
                        isNonDict: v.isNonDict
                    };

                } else {
                    mergedLemmas = [{
                        lemma: null,
                        word: userConfig.queries[queryIdx],
                        pos: [],
                        abs: 0,
                        ipm: 0,
                        arf: 0,
                        flevel: 0,
                        isCurrent: true,
                        isNonDict: true
                    }];
                }
                return mergedLemmas;
            });
            const [rootView, layout, _] = createRootComponent({
                config: runtimeConf,
                userSession: userConfig,
                lemmas: lemmasExtended,
                appServices: appServices,
                dispatcher: dispatcher,
                onResize: new Observable((observer) => undefined),
                viewUtils: viewUtils,
                cache: new DummyCache()
            });

            const view = viewInit(viewUtils);
            // Here we're going to use the fact that (the current)
            // server-side action dispatcher does not trigger side effects
            // so our models just set 'busy' state and nothing else happens.
            // The execution is synchronous here too.

            dispatcher.dispatch({
                name: ActionName.RequestQueryResponse
            });

            res.send(renderResult({
                view: view,
                services: services,
                toolbarData: hostPageEnv,
                lemmas: lemmasExtended,
                userConfig: userConf,
                clientConfig: runtimeConf,
                returnUrl: mkReturnUrl(req, services.clientConf.rootUrl),
                rootView: rootView,
                layout: layout,
                homepageSections: [...runtimeConf.homepage.tiles],
                isMobile: false, // TODO should we detect the mode on server too
                isAnswerMode: answerMode
            }));
        },
        (err:Error) => {
            services.errorLog.error(err.message, {trace: err.stack});
            userConfig.error = String(err);
            const view = viewInit(viewUtils);
            res.send(renderResult({
                view: view,
                services: services,
                toolbarData: emptyValue(),
                lemmas: [],
                userConfig: userConfig,
                clientConfig: emptyClientConf(services.clientConf),
                returnUrl: mkReturnUrl(req, services.clientConf.rootUrl),
                rootView: null,
                layout: [],
                homepageSections: [],
                isMobile: false, // TODO should we detect the mode on server too
                isAnswerMode: answerMode
            }));
        }
    );
}