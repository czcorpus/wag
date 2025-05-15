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
import { Express, Request, Response } from 'express';
import { ViewUtils } from 'kombo';
import { Observable, of as rxOf } from 'rxjs';
import { concatMap, map, reduce, tap } from 'rxjs/operators';
import { HTTP, List, pipe, Dict, tuple } from 'cnc-tskit';

import { AppServices } from '../../appServices.js';
import { encodeArgs } from '../../page/ajax.js';
import { QueryType, QueryMatch, importQueryTypeString } from '../../query/index.js';
import { GlobalComponents } from '../../views/common/index.js';
import { IFreqDB } from '../freqdb/freqdb.js';

import { getLangFromCookie, fetchReqArgArray, createHelperServices,
    mkPageReturnUrl, renderResult, getQueryValue, clientIsLikelyMobile } from './common.js';
import { queryAction, importQueryRequest } from './main.js';
import { Services } from '../actionServices.js';
import { HTTPAction } from './actions.js';
import { TelemetryAction } from '../../types.js';
import { errorUserConf, emptyClientConf, THEME_COOKIE_NAME, MainPosAttrValues } from '../../conf/index.js';
import { init as viewInit } from '../../views/layout/layout.js';
import { init as errPageInit } from '../../views/error.js';
import { emptyValue } from '../toolbar/empty.js';
import { importQueryPos } from '../../postag.js';
import { ServerHTTPRequestError } from '../request.js';
import { logAction } from '../actionLog/common.js';
import { DataStreaming } from '../../page/streaming.js';

const LANG_COOKIE_TTL = 3600 * 24 * 365;

interface ErrorPageArgs {
    req:Request;
    res:Response;
    uiLang:string;
    services:Services;
    viewUtils:ViewUtils<GlobalComponents>;
    error:[number, string];
}

export function errorPage({req, res, uiLang, services, viewUtils, error}:ErrorPageArgs):void {
    const userConf = errorUserConf(services.serverConf.languages, error, uiLang);
    const clientConfig = emptyClientConf(services.clientConf, req.cookies[THEME_COOKIE_NAME]);
    clientConfig.colorThemes = [];
    const {HtmlBody, HtmlHead} = viewInit(viewUtils);
    const errView = errPageInit(viewUtils);
    res
        .status(HTTP.Status.NotFound)
        .send(renderResult({
            HtmlBody,
            HtmlHead,
            services: services,
            toolbarData: emptyValue(),
            queryMatches: [],
            themes: [],
            currTheme: clientConfig.colors.themeId,
            userConfig: userConf,
            clientConfig: clientConfig,
            returnUrl: mkPageReturnUrl(req, services.clientConf.rootUrl),
            rootView: errView,
            layout: [],
            homepageSections: [],
            isMobile: false, // TODO should we detect the mode on server too
            isAnswerMode: false,
            version: services.version,
            repositoryUrl: services.repositoryUrl,
            error: error
        }));
}


function jsonOutputError(res:Response, err:Error):void {
    if (err instanceof ServerHTTPRequestError) {
        if (err.status < 400) {
            console.error(
                `invalid error status code for error ${err.constructor.name}: ${err.message}, (code: ${err.status})`
            );
        }
        res.status(err.status >= 400 ? err.status : HTTP.Status.InternalServerError).send({
            message: err.statusText
        });

    } else {
        res.status(HTTP.Status.InternalServerError).send({
            message: err.message
        });
    }
}

interface LangSwitchErrorArgs {
    req:Request;
    res:Response;
    services:Services;
    /**
     * untraslated message / message key
     */
    messageKey:string;
    messageArgs?:{[k:string]:any};
}

function langSwitchError({req, res, services, messageKey, messageArgs}:LangSwitchErrorArgs):void {
    const uiLang = getLangFromCookie(req, services);
    const [viewUtils,] = createHelperServices(services, uiLang);
    const error:[number, string] = [
        HTTP.Status.BadRequest,
        viewUtils.translate(messageKey, messageArgs)
    ];
    errorPage({req, res, uiLang, services, viewUtils, error});
}


export const wdgRouter = (services:Services) => (app:Express) => {

    // endpoint to receive client telemetry
    app.post(HTTPAction.TELEMETRY, (req, res, next) => {
        const [,appServices] = createHelperServices(services, getLangFromCookie(req, services));
        const t1 = new Date().getTime();

        if (!services.telemetryDB) {
            res.send({saved: false, procTimePerItem: 0});
            return;
        }

        const statement = services.telemetryDB.prepare(
            'INSERT INTO telemetry (session, timestamp, action, tile_name, is_subquery, is_mobile) values (?, ?, ?, ?, ?, ?)'
        );
        services.telemetryDB.run('BEGIN TRANSACTION');
        logAction({
            actionWriter: services.actionWriter,
            req,
            httpAction: HTTPAction.TELEMETRY,
            datetime: appServices.getISODatetime(),
            userConf: null,
            isMobileClient: clientIsLikelyMobile(req),
            userId: null,
            hasMatch: null
        }).subscribe();
        rxOf(
            ...(services.telemetryDB ? req.body['telemetry'] as Array<TelemetryAction> : [])
        ).pipe(
            concatMap(
                action => new Observable(observer => {
                    const data = [
                        req['session'].id,
                        action.timestamp,
                        action.actionName,
                        action.tileName,
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
        ).subscribe({
            next: total => {
                const t2 = new Date().getTime() - t1;
                res.send({saved: true, procTimePerItem: t2 / total});
            },
            error: (err:Error) => {
                services.errorLog.error(err.message, {trace: err.stack});
                res.status(500).send({saved: false, message: err});
            }
        });
    });

    // host page generator with some React server rendering (testing phase)
    app.get(HTTPAction.MAIN, (req, res, next) => {
        const uiLang = getLangFromCookie(req, services);
        queryAction({
            services,
            answerMode: false,
            httpAction: HTTPAction.MAIN,
            queryType: QueryType.SINGLE_QUERY,
            uiLang,
            req,
            res,
            next
        });
    });

    app.get(HTTPAction.GET_LEMMAS, (req, res, next) => {
        const [,appServices] = createHelperServices(services, getLangFromCookie(req, services));
        logAction({
            actionWriter: services.actionWriter,
            req,
            httpAction: HTTPAction.GET_LEMMAS,
            datetime: appServices.getISODatetime(),
            userId: null,
            userConf: null,
            isMobileClient: clientIsLikelyMobile(req),
            hasMatch: null
        }).subscribe();
        const queryDomain = getQueryValue(req, 'domain')[0];
        new Observable<IFreqDB>((observer) => {
            const db = services.db.getDatabase(QueryType.SINGLE_QUERY, queryDomain);
            if (db === undefined) {
                observer.error(
                    new ServerHTTPRequestError(HTTP.Status.BadRequest, `Frequency database for [${queryDomain}] not defined`));

            } else {
                observer.next(db);
                observer.complete();
            }
        }).pipe(
            concatMap(
                (db) => {
                    return db.findQueryMatches(
                        appServices,
                        getQueryValue(req, 'q')[0],
                        getQueryValue(
                            req,
                            'mainPosAttr',
                            services.clientConf.layouts[queryDomain][QueryType.SINGLE_QUERY].mainPosAttr,
                        )[0] as MainPosAttrValues, // TODO validate
                        1
                    );
                }
            )
        ).subscribe({
            next: data => {
                res.setHeader('Content-Type', 'application/json');
                res.send(JSON.stringify({result: data}));
            },
            error: (err:Error) => {
                jsonOutputError(res, err);
            }
        });
    });

    app.post(HTTPAction.SET_UI_LANG, (req, res, next) => {
        const [,appServices] = createHelperServices(services, getLangFromCookie(req, services));
        logAction({
            actionWriter: services.actionWriter,
            req,
            httpAction: HTTPAction.SET_UI_LANG,
            datetime: appServices.getISODatetime(),
            userId: null,
            userConf: null,
            isMobileClient: clientIsLikelyMobile(req),
            hasMatch: null
        }).subscribe();
        const newUiLang = req.body.lang;
        const cookieName = services.serverConf.langCookie?.name;
        const cookieDomain = services.serverConf.langCookie?.domain;

        if (!cookieName) {
            langSwitchError({
                req,
                res,
                services,
                messageKey: 'global__language_switching_not_conf',
            });

        } else if (Dict.hasKey(newUiLang, services.serverConf.languages)) {
            res.cookie(
                cookieName,
                services.toolbar.importLangCode(newUiLang),
                {
                    maxAge: LANG_COOKIE_TTL,
                    domain: cookieDomain
                }
            );
            res.redirect(req.body.returnUrl);

        } else {
            langSwitchError({
                req,
                res,
                services,
                messageKey: 'global__invalid_ui_lang_{lang}{avail}',
                messageArgs: {
                    lang: newUiLang,
                    avail: Dict.keys(services.serverConf.languages).join(', ')
                }
            });
        }
    });

    app.get(`${HTTPAction.SEARCH}:domain/:query`, (req, res, next) => {
        let uiLang = getLangFromCookie(req, services);
        const langOverride = getQueryValue(req, 'uiLang');

        if (langOverride.length > 0) {
            const cookieName = services.serverConf.langCookie?.name;
            const cookieDomain = services.serverConf.langCookie?.domain;
            if (!cookieName) {
                langSwitchError({
                    req,
                    res,
                    services,
                    messageKey: 'global__language_switching_not_conf'
                })

            } else if (Dict.hasKey(langOverride[0], services.serverConf.languages)) {
                res.cookie(
                    cookieName,
                    services.toolbar.importLangCode(langOverride[0]),
                    {
                        maxAge: LANG_COOKIE_TTL,
                        domain: cookieDomain
                    }
                );
                uiLang = langOverride[0];
                res.redirect(mkPageReturnUrl(req, services.clientConf.rootUrl));
                return;

            } else {
                langSwitchError({
                    req,
                    res,
                    services,
                    messageKey: 'global__invalid_ui_lang_{lang}{avail}',
                    messageArgs: {
                        lang: langOverride[0],
                        avail: Dict.keys(services.serverConf.languages).join(', ')
                    }
                });
                return;
            }
        }
        queryAction({
            services,
            answerMode: true,
            httpAction: HTTPAction.SEARCH,
            queryType: QueryType.SINGLE_QUERY,
            uiLang,
            req,
            res,
            next
        });
    });

    app.get(`${HTTPAction.EMBEDDED_SEARCH}:domain/:query`, (req, res, next) => {
        const uiLang = getLangFromCookie(req, services);
        const [,appServices] = createHelperServices(services, uiLang);
        importQueryRequest({
            services, appServices, req, queryType: QueryType.SINGLE_QUERY, uiLang, answerMode: true

        }).pipe(
            tap(userConf => {
                logAction({
                    actionWriter: services.actionWriter,
                    req,
                    httpAction: HTTPAction.EMBEDDED_SEARCH,
                    datetime: appServices.getISODatetime(),
                    userId: null,
                    userConf,
                    isMobileClient: clientIsLikelyMobile(req),
                    hasMatch: null
                }).subscribe();
            })
        ).subscribe({
            next: (conf) => {
                res.setHeader('Content-Type', 'application/json');
                res.send(JSON.stringify({
                    resultURL: appServices.createActionUrl(`${HTTPAction.SEARCH}${conf.query1Domain}/${conf.queries[0].word}`),
                    error: null
                }));
            },
            error: (err:Error) => {
                res.setHeader('Content-Type', 'application/json');
                res.status(HTTP.Status.BadRequest).send({
                    resultURL: null,
                    error: err.message
                });
            }
        })
    });

    app.get(HTTPAction.COMPARE, (req, res, next) => {
        const uiLang = getLangFromCookie(req, services);
        queryAction({
            services,
            answerMode: false,
            httpAction: HTTPAction.COMPARE,
            queryType: QueryType.CMP_QUERY,
            uiLang,
            req,
            res,
            next
        });
    });

    app.get(`${HTTPAction.COMPARE}:domain/:query`, (req, res, next) => {
        const uiLang = getLangFromCookie(req, services);
        queryAction({
            services,
            answerMode: true,
            httpAction: HTTPAction.COMPARE,
            queryType: QueryType.CMP_QUERY,
            uiLang,
            req,
            res,
            next
        });
    });

    app.get(`${HTTPAction.TRANSLATE}:domain/:query`, (req, res, next) => {
        const uiLang = getLangFromCookie(req, services);
        queryAction({
            services,
            answerMode: true,
            httpAction: HTTPAction.TRANSLATE,
            queryType: QueryType.TRANSLAT_QUERY,
            uiLang,
            req,
            res,
            next
        });
    });

    // Find words with similar frequency
    app.get(HTTPAction.SIMILAR_FREQ_WORDS, (req, res) => {
        const posRaw = fetchReqArgArray(req, 'pos', 0)[0];
        const pos:Array<string> = posRaw !== '' ? posRaw.split(',') :  [];
        const uiLang = getLangFromCookie(req, services);

        const viewUtils = new ViewUtils<GlobalComponents>({
            uiLang: uiLang,
            translations: services.translations,
            staticUrlCreator: (path) => services.clientConf.runtimeAssetsUrl + path,
            actionUrlCreator: (path, args) => services.clientConf.hostUrl + path + '?' + encodeArgs(args)
        });
        const appServices = new AppServices({
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
            dataStreaming: new DataStreaming(null, [], null, 1000, null),
            mobileModeTest: ()=>false
        });
        const queryDomain = getQueryValue(req, 'domain')[0];

        logAction({
            actionWriter: services.actionWriter,
            req,
            httpAction: HTTPAction.SIMILAR_FREQ_WORDS,
            datetime: appServices.getISODatetime(),
            userId: null,
            userConf: null,
            isMobileClient: clientIsLikelyMobile(req),
            hasMatch: null
        }).subscribe();

        new Observable<{
            domain:string;
            word:string;
            lemma:string;
            pos:Array<string>;
            posAttr:MainPosAttrValues,
            rng:number;
        }>((observer) => {
            if (isNaN(parseInt(getQueryValue(req, 'srchRange')[0]))) {
                observer.error(
                    new ServerHTTPRequestError(HTTP.Status.BadRequest, `Invalid range provided, srchRange = ${req.query.srchRange}`));

            } else if (services.db.getDatabase(QueryType.SINGLE_QUERY, queryDomain) === undefined) {
                observer.error(
                    new ServerHTTPRequestError(HTTP.Status.BadRequest, `Frequency database for [${queryDomain}] not defined`));

            } else {
                const posAttr = getQueryValue(req, 'mainPosAttr')[0] as MainPosAttrValues;
                observer.next({
                    domain: getQueryValue(req, 'domain')[0],
                    word: getQueryValue(req, 'word')[0],
                    lemma: getQueryValue(req, 'lemma')[0],
                    pos: List.map(v => importQueryPos(v, posAttr), pos),
                    posAttr: getQueryValue(req, 'mainPosAttr')[0] as MainPosAttrValues, // TODO validate
                    rng: Math.min(
                        parseInt(getQueryValue(req, 'srchRange')[0]),
                        services.serverConf.freqDB.single ?
                            services.serverConf.freqDB.single.similarFreqWordsMaxCtx :
                            0
                    )
                });
                observer.complete();
            }
        }).pipe(
            concatMap(
                (data) => services.db
                    .getDatabase(QueryType.SINGLE_QUERY, data.domain)
                    .getSimilarFreqWords(
                        appServices,
                        data.lemma,
                        data.pos,
                        data.posAttr,
                        data.rng
                    )
            ),
            map(
                (data) => data.sort((v1:QueryMatch, v2:QueryMatch) => {
                    if (v1.arf !== v2.arf) {
                        return v1.arf - v2.arf;
                    }
                    return v1.lemma.localeCompare(v2.lemma);
                })
            )
        )
        .subscribe({
            next: (data) => {
                res.setHeader('Content-Type', 'application/json');
                res.send(JSON.stringify({result: data}));
            },
            error: (err:Error) => {
                jsonOutputError(res, err);
            }
        });
    });

    app.get(HTTPAction.WORD_FORMS, (req, res) => {
        const uiLang = getLangFromCookie(req, services);
        const viewUtils = new ViewUtils<GlobalComponents>({
            uiLang: uiLang,
            translations: services.translations,
            staticUrlCreator: (path) => services.clientConf.runtimeAssetsUrl + path,
            actionUrlCreator: (path, args) => services.clientConf.hostUrl + path + '?' + encodeArgs(args)
        });
        const appServices = new AppServices({
            notifications: null, // TODO
            uiLang: uiLang,
            domainNames: pipe(
                services.clientConf.searchDomains,
                Dict.keys(),
                List.map(k => [k, services.clientConf.searchDomains[k]])
            ),
            translator: viewUtils,
            staticUrlCreator: viewUtils.createStaticUrl,
            actionUrlCreator: viewUtils.createActionUrl,
            dataReadability: {metadataMapping: {}, commonStructures: {}},
            apiHeadersMapping: services.clientConf.apiHeaders || {},
            dataStreaming: new DataStreaming(null, [], null, 1000, null),
            mobileModeTest: ()=>false
        });

        const freqDb = services.db.getDatabase(QueryType.SINGLE_QUERY, getQueryValue(req, 'domain')[0]);

        logAction({
            actionWriter: services.actionWriter,
            req,
            httpAction: HTTPAction.WORD_FORMS,
            datetime: appServices.getISODatetime(),
            userId: null,
            userConf: null,
            isMobileClient: clientIsLikelyMobile(req),
            hasMatch: null
        }).subscribe();

        new Observable<{
            domain:string;
            word:string;
            lemma:string;
            pos:Array<string>,
            posAttr:MainPosAttrValues
        }>((observer) => {
            if (freqDb === undefined) {
                observer.error(
                    new ServerHTTPRequestError(HTTP.Status.BadRequest, `Frequency database for [${req.query.lang}] not defined`));
            }
            const posAttr = getQueryValue(req, 'mainPosAttr')[0] as MainPosAttrValues;
            observer.next({
                domain: getQueryValue(req, 'domain')[0],
                word: getQueryValue(req, 'word')[0],
                lemma: getQueryValue(req, 'lemma')[0],
                pos: List.map(v => importQueryPos(v, posAttr), getQueryValue(req, 'pos')),
                posAttr
            });

        }).pipe(
            concatMap(
                (args) => freqDb
                    .getWordForms(
                        appServices,
                        args.lemma,
                        args.pos,
                        args.posAttr
                    )
            )

        ).subscribe({
            next: (data) => {
                res.setHeader('Content-Type', 'application/json');
                res.send(JSON.stringify({result: data}));
            },
            error: (err:Error) => {
                jsonOutputError(res, err);
            }
        });
    });


    app.post(HTTPAction.SET_THEME, (req, res) => {
        const [,appServices] = createHelperServices(services, getLangFromCookie(req, services));
        logAction({
            actionWriter: services.actionWriter,
            req,
            httpAction: HTTPAction.SET_THEME,
            datetime: appServices.getISODatetime(),
            userId: null,
            userConf: null,
            isMobileClient: clientIsLikelyMobile(req),
            hasMatch: null
        }).subscribe();

        res.cookie(THEME_COOKIE_NAME, req.body.themeId, {expires: new Date(Date.now() + 3600 * 24 * 365)});
        res.redirect(req.body.returnUrl);
    });

    app.get(HTTPAction.SOURCE_INFO, (req, res) => {
        const [,appServices] = createHelperServices(services, getLangFromCookie(req, services));
        logAction({
            actionWriter: services.actionWriter,
            req,
            httpAction: HTTPAction.SOURCE_INFO,
            datetime: appServices.getISODatetime(),
            userId: null,
            userConf: null,
            isMobileClient: clientIsLikelyMobile(req),
            hasMatch: null
        }).subscribe();

        const uiLang = getLangFromCookie(req, services).split('-')[0];
        const queryType = importQueryTypeString(getQueryValue(req, 'queryType')[0], QueryType.SINGLE_QUERY);
        const queryDomain = getQueryValue(req, 'domain')[0];

        new Observable<IFreqDB>((observer) => {
            const db = services.db.getDatabase(queryType, queryDomain);
            if (db === undefined) {
                observer.error(
                    new ServerHTTPRequestError(HTTP.Status.BadRequest, `Frequency database for [${queryDomain}] not defined`));

            } else {
                observer.next(db);
                observer.complete();
            }
        }).pipe(
            concatMap(
                (db) => {
                    return db.getSourceDescription(uiLang, getQueryValue(req, 'corpname')[0]);
                }
            )
        ).subscribe({
            next: (data) => {
                res.setHeader('Content-Type', 'application/json');
                res.send(JSON.stringify({result: data}));
            },
            error: (err:Error) => {
                jsonOutputError(res, err);
            }
        });
    })

    app.use(function (req, res, next) {
        const uiLang = getLangFromCookie(req, services);
        const [viewUtils,] = createHelperServices(services, uiLang);
        const error:[number, string] = [HTTP.Status.NotFound, viewUtils.translate('global__action_not_found')];
        errorPage({req, res, uiLang, services, viewUtils, error});
    });
}