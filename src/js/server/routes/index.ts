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
import { EMPTY, Observable } from 'rxjs';
import { concatMap, tap } from 'rxjs/operators';
import { HTTP, List, Dict } from 'cnc-tskit';

import { AppServices } from '../../appServices.js';
import { encodeArgs } from '../../page/ajax.js';
import { QueryType } from '../../query/index.js';
import { GlobalComponents } from '../../views/common/index.js';
import { IFreqDB } from '../freqdb/freqdb.js';

import { getLangFromCookie, createHelperServices,
    mkPageReturnUrl, renderResult, getQueryValue, clientIsLikelyMobile } from './common.js';
import { queryAction, importQueryRequest } from './main.js';
import { Services } from '../actionServices.js';
import { HTTPAction } from '../../page/actions.js';
import { errorUserConf, emptyClientConf, THEME_COOKIE_NAME, MainPosAttrValues, LAST_USED_TRANSLAT_LANG_COOKIE_NAME } from '../../conf/index.js';
import { init as viewInit } from '../../views/layout/layout.js';
import { init as errPageInit } from '../../views/error.js';
import { emptyValue } from '../toolbar/empty.js';
import { importQueryPos } from '../../postag.js';
import { ServerHTTPRequestError } from '../request.js';
import { logAction } from '../actionLog/common.js';
import { DataStreaming } from '../../page/streaming.js';
import { createInstance, FreqDBType } from '../freqdb/factory.js';
import urlJoin from 'url-join';
import { ServerNotifications } from '../../page/notifications.js';
import { schemaPage } from './schema.js';

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
    const userConf = errorUserConf(
        services.clientConf.applicationId,
        services.serverConf.languages,
        error,
        uiLang
    );
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
            currentParentWagPageUrl: undefined,
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

    // host page generator with some React server rendering (testing phase)
    app.get(HTTPAction.MAIN, (req, res, next) => {
        res.redirect(301, urlJoin(services.clientConf.rootUrl, HTTPAction.SEARCH));
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
        new Observable<IFreqDB>((observer) => {
            const db = createInstance(
                services.serverConf.freqDB.database.dbType as FreqDBType,
                services.serverConf.freqDB.database.path,
                services.serverConf.freqDB.database.corpusSize,
                appServices,
                services.serverConf.freqDB.database.options || {}
            );
            observer.next(db);
            observer.complete();

        }).pipe(
            concatMap(
                (db) => {
                    return db.findQueryMatches(
                        appServices,
                        getQueryValue(req, 'q')[0],
                        getQueryValue(
                            req,
                            'mainPosAttr',
                            services.clientConf.layouts[QueryType.SINGLE_QUERY].mainPosAttr,
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

    app.get(HTTPAction.SEARCH, (req, res, next) => {
        const uiLang = getLangFromCookie(req, services);
        queryAction({
            services,
            answerMode: false,
            httpAction: HTTPAction.SEARCH,
            queryType: QueryType.SINGLE_QUERY,
            uiLang,
            req,
            res,
            next
        });

    });

    app.get(`${HTTPAction.SEARCH}:query`, (req, res, next) => {
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

    //TODO !!! keep legacy links operational
    app.get(`/cs${HTTPAction.EMBEDDED_SEARCH}:query`, (req, res, next) => {

    });

    app.get(`/${HTTPAction.EMBEDDED_SEARCH}:query`, (req, res, next) => {
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
                    resultURL: appServices.createActionUrl(`${HTTPAction.SEARCH}${conf.queries[0].word}`),
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

    // -------------------- CMP mode ----------------------------------------

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

    app.get(`${HTTPAction.COMPARE}:query`, (req, res, next) => {
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

    // -------------------- TRANSLAT mode ----------------------------------------

    app.get(HTTPAction.TRANSLATE, (req, res, next) => {
        const uiLang = getLangFromCookie(req, services);
        queryAction({
            services,
            answerMode: false,
            httpAction: HTTPAction.TRANSLATE,
            queryType: QueryType.TRANSLAT_QUERY,
            uiLang,
            req,
            res,
            next
        });
    });

    app.get(`${HTTPAction.TRANSLATE}:lang/:query`, (req, res, next) => {
        const uiLang = getLangFromCookie(req, services);
        res.cookie(
            LAST_USED_TRANSLAT_LANG_COOKIE_NAME,
            req.params.lang,
            {expires: new Date(Date.now() + 3600 * 24 * 365)}
        );
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

    // ------------------------------------------------------------

    app.get(HTTPAction.WORD_FORMS, (req, res) => {
        const uiLang = getLangFromCookie(req, services);
        const viewUtils = new ViewUtils<GlobalComponents>({
            uiLang: uiLang,
            translations: services.translations,
            staticUrlCreator: (path) => services.clientConf.runtimeAssetsUrl + path,
            actionUrlCreator: (path, args) => services.clientConf.hostUrl + path + '?' + encodeArgs(args)
        });
        const appServices = new AppServices({
            notifications: new ServerNotifications(),
            uiLang: uiLang,
            translator: viewUtils,
            staticUrlCreator: viewUtils.createStaticUrl,
            actionUrlCreator: viewUtils.createActionUrl,
            dataReadability: {metadataMapping: {}, commonStructures: {}},
            apiHeadersMapping: services.clientConf.apiHeaders || {},
            apiCaller: {
                callAPI: (api, streaming, tileId, queryIdx, queryArgs) => EMPTY,
                callAPIWithExtraVal: (api, streaming, tileId, queryIdx, queryArgs, passThrough) => EMPTY
            },
            dataStreaming: new DataStreaming(null, [], null, 1000, null),
            mobileModeTest: ()=>false
        });

        const freqDb = createInstance(
            services.serverConf.freqDB.database.dbType as FreqDBType,
            services.serverConf.freqDB.database.path,
            services.serverConf.freqDB.database.corpusSize,
            appServices,
            services.serverConf.freqDB.database.options || {}
        );

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

        new Observable<IFreqDB>((observer) => {
            try {
                const db = createInstance(
                    services.serverConf.freqDB.database.dbType as FreqDBType,
                    services.serverConf.freqDB.database.path,
                    services.serverConf.freqDB.database.corpusSize,
                    appServices,
                    services.serverConf.freqDB.database.options || {}
                );
                observer.next(db);
                observer.complete();

            } catch (err) {
                observer.error(err);
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

    // -------------------- schema page ----------------------------------------

    app.get(HTTPAction.SCHEMA_SEARCH, (req, res, next) => {
        const uiLang = getLangFromCookie(req, services);
        schemaPage({
            services,
            answerMode: true,
            httpAction: HTTPAction.SCHEMA_SEARCH,
            queryType: QueryType.SINGLE_QUERY,
            uiLang,
            req,
            res,
            next
        });
    });

    app.get(HTTPAction.SCHEMA_COMPARE, (req, res, next) => {
        const uiLang = getLangFromCookie(req, services);
        schemaPage({
            services,
            answerMode: true,
            httpAction: HTTPAction.SCHEMA_COMPARE,
            queryType: QueryType.CMP_QUERY,
            uiLang,
            req,
            res,
            next
        });
    });

    // ----------------------------------------------------------------------

    app.use(function (req, res, next) {
        const uiLang = getLangFromCookie(req, services);
        const [viewUtils,] = createHelperServices(services, uiLang);
        const error:[number, string] = [HTTP.Status.NotFound, viewUtils.translate('global__action_not_found')];
        errorPage({req, res, uiLang, services, viewUtils, error});
    });
}