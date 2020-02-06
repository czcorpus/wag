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
import { concatMap, map, catchError, reduce, tap } from 'rxjs/operators';


import { AppServices } from '../appServices';
import { encodeArgs } from '../common/ajax';
import { ErrorType, mapToStatusCode, newError } from '../common/errors';
import { HostPageEnv, AvailableLanguage } from '../common/hostPage';
import { QueryType, LemmaVariant, importQueryPos, QueryPoS, matchesPos, findMergeableLemmas, RecognizedQueries, importQueryTypeString } from '../common/query';
import { UserConf, ClientStaticConf, ClientConf, emptyClientConf, getSupportedQueryTypes, emptyLayoutConf, getQueryTypeFreqDb, DEFAULT_WAIT_FOR_OTHER_TILES } from '../conf';
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
import { TelemetryAction } from '../common/types';
import { Dict, List, pipe } from '../common/collections';



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
            queryPos: userConfig.queryPos ? userConfig.queryPos.map(v => v.join(',')) : null,
            query: userConfig.queries,
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

function fetchReqArgArray<T extends string>(req:Request, arg:string, minLen:number):Array<T> {

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

function mainAction(services:Services, answerMode:boolean, req:Request, res:Response, next:NextFunction) {
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
        logReq: logRequest(services.logging, appServices.getISODatetime(), req, userConfig),
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
        (ans) => {
            const lemmasExtended = ans.lemmasEachQuery.map((lemmas, queryIdx) => {
                let mergedLemmas = findMergeableLemmas(lemmas);
                if (mergedLemmas.length > 0) {
                    let matchIdx = 0;
                    if (ans.userConf.queryPos[queryIdx]) {
                        const srchIdx = mergedLemmas.findIndex(
                            v => matchesPos(v, ans.userConf.queryPos[queryIdx]) && (v.lemma === ans.userConf.lemma[queryIdx] || !ans.userConf.lemma[queryIdx]));
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
                config: ans.runtimeConf,
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
                toolbarData: ans.hostPageEnv,
                lemmas: lemmasExtended,
                userConfig: ans.userConf,
                clientConfig: ans.runtimeConf,
                returnUrl: mkReturnUrl(req, services.clientConf.rootUrl),
                rootView: rootView,
                layout: layout,
                homepageSections: [...ans.runtimeConf.homepage.tiles],
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
                layout: [],
                homepageSections: [],
                isMobile: false, // TODO should we detect the mode on server too
                isAnswerMode: answerMode
            }));
        }
    );
}


export const wdgRouter = (services:Services) => (app:Express) => {
    // endpoint to receive client telemetry
    app.post(HTTPAction.TELEMETRY, (req, res, next) => {
        const t1 = new Date().getTime();
        const statement = services.telemetryDB.prepare(
            'INSERT INTO telemetry (session, timestamp, action, tile_name, is_subquery, is_mobile) values (?, ?, ?, ?, ?, ?)'
        );
        services.telemetryDB.run('BEGIN TRANSACTION');
        rxOf(...(services.telemetryDB ? req.body['telemetry'] as Array<TelemetryAction> : [])).pipe(
            concatMap(
                action => new Observable(observer => {
                    const data = [
                        req['session'].id,
                        action.timestamp,
                        action.actionName,
                        action.tileName,
                        action.isSubquery ? 1 : 0,
                        action.isMobile ? 1 : 0
                    ];
                    statement.run(data, (err:Error, res) => {
                        if (err) {
                            observer.error(err);

                        } else {
                            observer.next(res);
                            observer.complete();
                        }
                    });
                })
            ),
            reduce(
                (acc, curr) => acc + 1,
                0
            ),
            tap(
                () => services.telemetryDB.run('COMMIT')
            )
        ).subscribe(
            (total) => {
                const t2 = new Date().getTime() - t1;
                res.send({saved: true, procTimePerItem: t2 / total});
            },
            (err) => res.status(500).send({saved: false, message: err})
        );
    });

    // host page generator with some React server rendering (testing phase)
    app.get(HTTPAction.MAIN, (req, res, next) => mainAction(services, false, req, res, next));

    app.post(HTTPAction.SET_UI_LANG, (req, res, next) => {
        res.cookie(services.serverConf.langCookie, req.body.lang, {maxAge: 3600 * 24 * 365});
        res.redirect(req.body.returnUrl);
    });

    app.get(HTTPAction.SEARCH, (req, res, next) => mainAction(services, true, req, res, next));

    // Find words with similar frequency
    app.get(HTTPAction.SIMILAR_FREQ_WORDS, (req, res) => {

        const pos:Array<string> = fetchReqArgArray(req, 'pos', 0)[0].split(',');
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
            searchLanguages: Object.keys(services.clientConf.searchLanguages).map(k => [k, services.clientConf.searchLanguages[k]]),
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

            } else if (services.db.getDatabase(QueryType.SINGLE_QUERY, req.query.lang) === undefined) {
                observer.error(
                    newError(ErrorType.BAD_REQUEST, `Frequency database for [${req.query.lang}] not defined`));

            } else {
                observer.next({
                    lang: req.query.lang,
                    word: req.query.word,
                    lemma: req.query.lemma,
                    pos: pos.map(importQueryPos),
                    rng: Math.min(
                        req.query.srchRange,
                        services.serverConf.freqDB.single ?
                            services.serverConf.freqDB.single.similarFreqWordsMaxCtx :
                            0
                    )
                });
                observer.complete();
            }
        }).pipe(
            concatMap(
                (data) => {
                    return getSimilarFreqWords(
                        services.db.getDatabase(QueryType.SINGLE_QUERY, data.lang),
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
            searchLanguages: Object.keys(services.clientConf.searchLanguages).map(k => [k, services.clientConf.searchLanguages[k]]),
            translator: viewUtils,
            staticUrlCreator: viewUtils.createStaticUrl,
            actionUrlCreator: viewUtils.createActionUrl,
            dbValuesMapping: services.clientConf.dbValuesMapping || {},
            apiHeadersMapping: services.clientConf.apiHeaders || {},
            mobileModeTest: ()=>false
        });

        new Observable<{lang:string; word:string; lemma:string; pos:Array<QueryPoS>}>((observer) => {
            const freqDb = services.db.getDatabase(QueryType.SINGLE_QUERY, req.query.lang);
            if (freqDb === undefined) {
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
                    services.db.getDatabase(QueryType.SINGLE_QUERY, args.lang),
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