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
import { Express, Request, Response } from 'express';
import { ViewUtils } from 'kombo';
import * as React from 'react';
import { renderToString } from 'react-dom/server';
import { Observable, forkJoin, of as rxOf } from 'rxjs';
import { concatMap, map, catchError } from 'rxjs/operators';
import * as Immutable from 'immutable';


import { AppServices } from '../appServices';
import { encodeArgs } from '../common/ajax';
import { ErrorType, mapToStatusCode, newError } from '../common/errors';
import { HostPageEnv, AvailableLanguage } from '../common/hostPage';
import { QueryType, LemmaVariant, importQueryPos, QueryPoS, matchesPos, findMergeableLemmas } from '../common/query';
import { UserConf, ClientStaticConf, ClientConf, emptyClientConf, getSupportedQueryTypes } from '../conf';
import { GlobalComponents } from '../views/global';
import { init as viewInit, LayoutProps } from '../views/layout';
import { ServerSideActionDispatcher } from './core';
import { emptyValue } from './toolbar/empty';
import { Services } from './actionServices';
import { getLemmas, getSimilarFreqWords, getWordForms } from './freqdb/freqdb';
import { loadFile } from './files';
import { HTTPAction } from './actions';
import { createRootComponent } from '../app';
import { WdglanceMainProps } from '../views/main';
import { TileGroup } from '../layout';
import { ActionName } from '../models/actions';
import { DummyCache } from '../cacheDb';
import { ILogQueue } from './logging/abstract';


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
            corpInfoApiUrl: conf.corpInfoApiUrl,
            apiHeaders: conf.apiHeaders,
            reqCacheTTL: conf.reqCacheTTL,
            onLoadInit: conf.onLoadInit,
            dbValuesMapping: conf.dbValuesMapping,
            colors: conf.colors,
            tiles: conf.tiles[lang],
            layouts: conf.layouts[lang],
            searchLanguages: Object.keys(conf.searchLanguages).map(k => ({
                code: k,
                label: conf.searchLanguages[k],
                queryTypes: getSupportedQueryTypes(conf, k)
            })),
            homepage: {
                tiles: item
            }
        }))
    );
}


interface RenderResultArgs {
    view:React.SFC<LayoutProps>;
    services:Services;
    toolbarData:HostPageEnv;
    lemmas:Array<LemmaVariant>;
    userConfig:UserConf;
    clientConfig:ClientConf;
    returnUrl:string;
    rootView:React.ComponentType<WdglanceMainProps>;
    homepageSections:Immutable.List<{label:string; html:string}>;
    layout:Immutable.List<TileGroup>;
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
                uiLanguages: Immutable.List<AvailableLanguage>(Object.entries(userConfig.uiLanguages)),
                uiLang: userConfig.uiLang,
                returnUrl: returnUrl,
                homepageTiles: Immutable.List<{label:string; html:string}>(clientConfig.homepage.tiles),
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

function createHelperServices(services:Services, uiLang:string):[ViewUtils<GlobalComponents>, AppServices] {
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
            translator: viewUtils,
            staticUrlCreator: viewUtils.createStaticUrl,
            actionUrlCreator: viewUtils.createActionUrl,
            dbValuesMapping: services.clientConf.dbValuesMapping || {},
            apiHeadersMapping: services.clientConf.apiHeaders || {},
            mobileModeTest: ()=>false
        })
    ]
}

function mkReturnUrl(req:Request, rootUrl:string):string {
    return rootUrl.replace(/\/$/, '') +
        req.path +
        (req.query && Object.keys(req.query).length > 0 ? '?' + encodeArgs(req.query) : '');
}

function getLangFromCookie(req:Request, cookieName:string, languages:{[code:string]:string}):string {
    const ans = req.cookies[cookieName] || 'en-US';
    if (languages.hasOwnProperty(ans)) {
        return ans;

    } else {
        const srch = Object.keys(languages).find(k => k.split('-')[0] === ans.split('-')[0]);
        return srch ? srch : 'en-US';
    }
}

function logRequest(logging:ILogQueue, datetime:string, req:Request, userConfig:UserConf):Observable<number> {
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
            queryPos: userConfig.queryPos ? userConfig.queryPos : null,
            query1: userConfig.query1,
            query2: userConfig.query2 ? userConfig.query2 : null,
            error: userConfig.error ? userConfig.error : null
        },
        pid: -1,
        settings: {}
    }).pipe(
        catchError(
            (err) => {
                console.error(err);
                return rxOf(0);
            }
        )
    )
}

function mainAction(services:Services, answerMode:boolean, req:Request, res:Response, next:NextFunction) {

    const userConfig:UserConf = {
        uiLang: getLangFromCookie(req, services.serverConf.langCookie, services.serverConf.languages),
        uiLanguages: services.serverConf.languages,
        query1Lang: req.query['lang1'] || 'cs',
        query2Lang: req.query['lang2'] || 'en',
        queryType: req.query['queryType'] || 'single',
        queryPos: req.query['pos'],
        query1: req.query['q1'] || '',
        query2: req.query['q2'] || '',
        lemma1: req.query['lemma1'] || '',
        answerMode: answerMode
    };

    const dispatcher = new ServerSideActionDispatcher();
    const [viewUtils, appServices] = createHelperServices(services, userConfig.uiLang);
    forkJoin(
        new Observable<UserConf>(
            (observer) => {
                if (userConfig.queryType === QueryType.TRANSLAT_QUERY && userConfig.query1Lang === userConfig.query2Lang) {
                    userConfig.error = appServices.translate('global__src_and_dst_langs_must_be_different');
                }
                observer.next(userConfig);
                observer.complete();
            }
        ),
        services.toolbar.get(userConfig.uiLang, mkReturnUrl(req, services.clientConf.rootUrl), req.cookies, viewUtils),
        getLemmas(services.db[userConfig.query1Lang], appServices, userConfig.query1, services.serverConf.freqDB.minLemmaFreq),
        mkRuntimeClientConf(services.clientConf, userConfig.query1Lang, appServices),
        logRequest(services.logging, appServices.getISODatetime(), req, userConfig)
    )
    .subscribe(
        (ans) => {
            const [userSession, toolbar, lemmas, runtimeConf] = ans;
            let currentFlagSolved = false;
            const lemmasExtended = findMergeableLemmas(lemmas);

            const [rootView, layout] = createRootComponent({
                config: runtimeConf,
                userSession: userConfig,
                lemmas: lemmasExtended,
                appServices: appServices,
                dispatcher: dispatcher,
                onResize: new Observable((observer) => undefined),
                viewUtils: viewUtils,
                cache: new DummyCache()
            });


            if (lemmasExtended.length > 0) {
                if (userSession.queryPos) {
                    const srchIdx = lemmasExtended.findIndex(v => matchesPos(v, userSession.queryPos) && (v.lemma === userSession.lemma1 || !userSession.lemma1));
                    if (srchIdx > -1) {
                        lemmasExtended[srchIdx].isCurrent = true;
                    }
                    currentFlagSolved = true; // even if we do not set anything (error detected on client)
                }
                if (!currentFlagSolved) {
                    lemmasExtended[0].isCurrent = true;
                }
            }
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
                toolbarData: toolbar,
                lemmas: lemmasExtended,
                userConfig: userSession,
                clientConfig: runtimeConf,
                returnUrl: mkReturnUrl(req, services.clientConf.rootUrl),
                rootView: rootView,
                layout: layout,
                homepageSections: Immutable.List<{label:string, html:string}>(runtimeConf.homepage.tiles),
                isMobile: false, // TODO should we detect the mode on server too
                isAnswerMode: answerMode
            }));
        },
        (err) => {
            console.log(err);
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
                layout: Immutable.List(),
                homepageSections: Immutable.List<{label:string, html:string}>(services.clientConf.homepage.tiles),
                isMobile: false, // TODO should we detect the mode on server too
                isAnswerMode: answerMode
            }));
        }
    );
}

export const wdgRouter = (services:Services) => (app:Express) => {

    // host page generator with some React server rendering (testing phase)
    app.get(HTTPAction.MAIN, (req, res, next) => mainAction(services, false, req, res, next));

    app.post(HTTPAction.SET_UI_LANG, (req, res, next) => {
        res.cookie(services.serverConf.langCookie, req.body.lang, {maxAge: 3600 * 24 * 365});
        res.redirect(req.body.returnUrl);
    });

    app.get(HTTPAction.SEARCH, (req, res, next) => mainAction(services, true, req, res, next));

    app.get(HTTPAction.GET_LEMMAS, (req, res, next) => {
        const [viewUtils, appServices] = createHelperServices(
            services, getLangFromCookie(req, services.serverConf.langCookie, services.serverConf.languages));

        new Observable<{lang:string}>((observer) => {
            if (Object.keys(services.db).indexOf(req.query.lang) === -1) {
                observer.error(
                    newError(ErrorType.BAD_REQUEST, `Frequency database for [${req.query.lang}] not defined`));

            } else {
                observer.next({lang: req.query.lang});
                observer.complete();
            }
        }).pipe(
            concatMap(
                (conf) => {
                    return getLemmas(services.db[conf.lang], appServices, req.query.q, 1);
                }
            )
        ).subscribe(
            (data) => {
                res.setHeader('Content-Type', 'application/json');
                res.send(JSON.stringify({result: data}));
            },
            (err:Error) => {
                res.status(mapToStatusCode(err.name)).send({
                    message: err.message
                });
            }
        );
    })

    // Find words with similar frequency
    app.get(HTTPAction.SIMILAR_FREQ_WORDS, (req, res) => {

        const pos:string|Array<string> = req.query.pos;
        const uiLang = getLangFromCookie(req, services.serverConf.langCookie, services.serverConf.languages);

        const viewUtils = new ViewUtils<GlobalComponents>({
            uiLang: uiLang,
            translations: services.translations,
            staticUrlCreator: (path) => services.clientConf.rootUrl + 'assets/' + path,
            actionUrlCreator: (path, args) => services.clientConf.hostUrl + path + '?' + encodeArgs(args)
        });
        const appServices = new AppServices({
            notifications: null, // TODO
            uiLang: uiLang,
            translator: viewUtils,
            staticUrlCreator: viewUtils.createStaticUrl,
            actionUrlCreator: viewUtils.createActionUrl,
            dbValuesMapping: services.clientConf.dbValuesMapping || {},
            apiHeadersMapping: services.clientConf.apiHeaders || {},
            mobileModeTest: ()=>false
        });

        new Observable<{lang:string; word:string; lemma:string; pos:Array<QueryPoS>; rng:number}>((observer) => {
            if (isNaN(parseInt(req.query.srchRange))) {
                observer.error(
                    newError(ErrorType.BAD_REQUEST, `Invalid range provided, srchRange = ${req.query.srchRange}`));

            } else if (Object.keys(services.db).indexOf(req.query.lang) === -1) {
                observer.error(
                    newError(ErrorType.BAD_REQUEST, `Frequency database for [${req.query.lang}] not defined`));

            } else {
                observer.next({
                    lang: req.query.lang,
                    word: req.query.word,
                    lemma: req.query.lemma,
                    pos: (Array.isArray(pos) ? pos : [pos]).map(importQueryPos),
                    rng: Math.min(req.query.srchRange, services.serverConf.freqDB.similarFreqWordsMaxCtx)
                });
                observer.complete();
            }
        }).pipe(
            concatMap(
                (data) => {
                    return getSimilarFreqWords(
                        services.db[data.lang],
                        appServices,
                        data.lemma,
                        data.pos,
                        data.rng
                    );
                }
            ),
            map(
                (data) => data.sort((v1:LemmaVariant, v2:LemmaVariant) => {
                    if (v1.arf !== v2.arf) {
                        return v1.arf - v2.arf;
                    }
                    return v1.lemma.localeCompare(v2.lemma);
                })
            )
        )
        .subscribe(
            (data) => {
                res.setHeader('Content-Type', 'application/json');
                res.send(JSON.stringify({result: data}));
            },
            (err:Error) => {
                res.status(mapToStatusCode(err.name)).send({
                    message: err.message
                });
            }
        );
    });

    app.get(HTTPAction.WORD_FORMS, (req, res) => {
        const uiLang = getLangFromCookie(req, services.serverConf.langCookie, services.serverConf.languages);
        const viewUtils = new ViewUtils<GlobalComponents>({
            uiLang: uiLang,
            translations: services.translations,
            staticUrlCreator: (path) => services.clientConf.rootUrl + 'assets/' + path,
            actionUrlCreator: (path, args) => services.clientConf.hostUrl + path + '?' + encodeArgs(args)
        });
        const appServices = new AppServices({
            notifications: null, // TODO
            uiLang: uiLang,
            translator: viewUtils,
            staticUrlCreator: viewUtils.createStaticUrl,
            actionUrlCreator: viewUtils.createActionUrl,
            dbValuesMapping: services.clientConf.dbValuesMapping || {},
            apiHeadersMapping: services.clientConf.apiHeaders || {},
            mobileModeTest: ()=>false
        });

        new Observable<{lang:string; word:string; lemma:string; pos:Array<QueryPoS>}>((observer) => {
            if (Object.keys(services.db).indexOf(req.query.lang) === -1) {
                observer.error(
                    newError(ErrorType.BAD_REQUEST, `Frequency database for [${req.query.lang}] not defined`));
            }
            observer.next({
                lang: req.query.lang,
                word: req.query.word,
                lemma: req.query.lemma,
                pos: (Array.isArray(req.query.pos) ? req.query.pos : [req.query.pos]).map(importQueryPos)
            });

        }).pipe(
            concatMap(
                (args) => getWordForms(
                    services.db[args.lang],
                    appServices,
                    args.lemma,
                    args.pos
                )
            )

        ).subscribe(
            (data) => {
                res.setHeader('Content-Type', 'application/json');
                res.send(JSON.stringify({result: data}));
            },
            (err:Error) => {
                res.status(mapToStatusCode(err.name)).send({
                    message: err.message
                });
            }
        );
    });
}