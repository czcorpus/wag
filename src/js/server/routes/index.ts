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
import { Express } from 'express';
import { ViewUtils } from 'kombo';
import { Observable, of as rxOf } from 'rxjs';
import { concatMap, map, reduce, tap } from 'rxjs/operators';
import { HTTP, List, pipe, Dict, tuple } from 'cnc-tskit';

import { AppServices } from '../../appServices';
import { encodeArgs } from '../../common/ajax';
import { ErrorType, mapToStatusCode, newError } from '../../common/errors';
import { QueryType, QueryMatch, importQueryTypeString } from '../../common/query/index';
import { GlobalComponents } from '../../views/global';
import { IFreqDB } from '../freqdb/freqdb';

import { getLangFromCookie, fetchReqArgArray, createHelperServices, mkReturnUrl, renderResult, getQueryValue } from './common';
import { queryAction, importQueryRequest } from './main';
import { Services } from '../actionServices';
import { HTTPAction } from './actions';
import { TelemetryAction } from '../../common/types';
import { errorUserConf, emptyClientConf, THEME_COOKIE_NAME } from '../../conf';
import { init as viewInit } from '../../views/layout';
import { init as errPageInit } from '../../views/error';
import { emptyValue } from '../toolbar/empty';
import { importQueryPos } from '../../common/postag';

const LANG_COOKIE_TTL = 3600 * 24 * 365;

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
            (err:Error) => {
                services.errorLog.error(err.message, {trace: err.stack});
                res.status(500).send({saved: false, message: err});
            }
        );
    });

    // host page generator with some React server rendering (testing phase)
    app.get(HTTPAction.MAIN, (req, res, next) => {
        queryAction(services, false, QueryType.SINGLE_QUERY, req, res, next);
    });

    app.get(HTTPAction.GET_LEMMAS, (req, res, next) => {
        const [,appServices] = createHelperServices(
            services, getLangFromCookie(req, services.serverConf.langCookie, services.serverConf.languages));
        const queryLang = getQueryValue(req, 'lang')[0];
        new Observable<IFreqDB>((observer) => {
            const db = services.db.getDatabase(QueryType.SINGLE_QUERY, queryLang);
            if (db === undefined) {
                observer.error(
                    newError(ErrorType.BAD_REQUEST, `Frequency database for [${queryLang}] not defined`));

            } else {
                observer.next(db);
                observer.complete();
            }
        }).pipe(
            concatMap(
                (db) => {
                    return db.findQueryMatches(appServices, getQueryValue(req, 'q')[0], 1);
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
    });

    app.post(HTTPAction.SET_UI_LANG, (req, res, next) => {
        res.cookie(services.serverConf.langCookie, req.body.lang, {maxAge: LANG_COOKIE_TTL});
        res.redirect(req.body.returnUrl);
    });

    app.get(`${HTTPAction.SEARCH}:lang/:query`, (req, res, next) => {
        const langOverride = getQueryValue(req, 'uiLang');
        if (langOverride) {
            res.cookie(services.serverConf.langCookie, req.body.lang, {maxAge: LANG_COOKIE_TTL});
        }
        queryAction(services, true, QueryType.SINGLE_QUERY, req, res, next);
    });

    app.get(`/embedded${HTTPAction.SEARCH}:lang/:query`, (req, res, next) => {
        const uiLang = getLangFromCookie(req, services.serverConf.langCookie, services.serverConf.languages);
        const [,appServices] = createHelperServices(services, uiLang);
        importQueryRequest({
            services, appServices, req, queryType: QueryType.SINGLE_QUERY, uiLang, answerMode: true

        }).subscribe(
            (conf) => {
                res.setHeader('Content-Type', 'application/json');
                res.send(JSON.stringify({
                    resultURL: appServices.createActionUrl(`${HTTPAction.SEARCH}${conf.query1Lang}/${conf.queries[0].word}`),
                    error: null
                }));
            },
            (err:Error) => {
                res.setHeader('Content-Type', 'application/json');
                res.status(HTTP.Status.BadRequest).send({
                    resultURL: null,
                    error: err.message
                });
            }
        )
    });

    app.get(`${HTTPAction.COMPARE}:lang/:query`, (req, res, next) => {
        queryAction(services, true, QueryType.CMP_QUERY, req, res, next);
    });

    app.get(`${HTTPAction.TRANSLATE}:lang/:query`, (req, res, next) => {
        queryAction(services, true, QueryType.TRANSLAT_QUERY, req, res, next);
    });

    // Find words with similar frequency
    app.get(HTTPAction.SIMILAR_FREQ_WORDS, (req, res) => {

        const posRaw = fetchReqArgArray(req, 'pos', 0)[0];
        const pos:Array<string> = posRaw !== '' ? posRaw.split(',') :  [];
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
            searchLanguages: pipe(
                services.clientConf.searchLanguages,
                Dict.keys(),
                List.map(k => tuple(k, services.clientConf.searchLanguages[k]))
            ),
            translator: viewUtils,
            staticUrlCreator: viewUtils.createStaticUrl,
            actionUrlCreator: viewUtils.createActionUrl,
            dbValuesMapping: services.clientConf.dbValuesMapping || {},
            apiHeadersMapping: services.clientConf.apiHeaders || {},
            mobileModeTest: ()=>false
        });
        const queryLang = getQueryValue(req, 'lang')[0];

        new Observable<{lang:string; word:string; lemma:string; pos:Array<string>; rng:number}>((observer) => {
            if (isNaN(parseInt(getQueryValue(req, 'srchRange')[0]))) {
                observer.error(
                    newError(ErrorType.BAD_REQUEST, `Invalid range provided, srchRange = ${req.query.srchRange}`));

            } else if (services.db.getDatabase(QueryType.SINGLE_QUERY, queryLang) === undefined) {
                observer.error(
                    newError(ErrorType.BAD_REQUEST, `Frequency database for [${queryLang}] not defined`));

            } else {
                observer.next({
                    lang: getQueryValue(req, 'lang')[0],
                    word: getQueryValue(req, 'word')[0],
                    lemma: getQueryValue(req, 'lemma')[0],
                    pos: List.map(v => importQueryPos(v), pos),
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
                    .getDatabase(QueryType.SINGLE_QUERY, data.lang)
                    .getSimilarFreqWords(
                        appServices,
                        data.lemma,
                        data.pos,
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
        .subscribe(
            (data) => {
                res.setHeader('Content-Type', 'application/json');
                res.send(JSON.stringify({result: data}));
            },
            (err:Error) => {
                services.errorLog.error(err.message, {trace: err.stack});
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
            searchLanguages: pipe(
                services.clientConf.searchLanguages,
                Dict.keys(),
                List.map(k => [k, services.clientConf.searchLanguages[k]])
            ),
            translator: viewUtils,
            staticUrlCreator: viewUtils.createStaticUrl,
            actionUrlCreator: viewUtils.createActionUrl,
            dbValuesMapping: services.clientConf.dbValuesMapping || {},
            apiHeadersMapping: services.clientConf.apiHeaders || {},
            mobileModeTest: ()=>false
        });

        const freqDb = services.db.getDatabase(QueryType.SINGLE_QUERY, getQueryValue(req, 'lang')[0]);

        new Observable<{lang:string; word:string; lemma:string; pos:Array<string>}>((observer) => {
            if (freqDb === undefined) {
                observer.error(
                    newError(ErrorType.BAD_REQUEST, `Frequency database for [${req.query.lang}] not defined`));
            }
            observer.next({
                lang: getQueryValue(req, 'lang')[0],
                word: getQueryValue(req, 'word')[0],
                lemma: getQueryValue(req, 'lemma')[0],
                pos: List.map(v => importQueryPos(v), getQueryValue(req, 'pos'))
            });

        }).pipe(
            concatMap(
                (args) => freqDb
                    .getWordForms(
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
                services.errorLog.error(err.message, {trace: err.stack});
                res.status(mapToStatusCode(err.name)).send({
                    message: err.message
                });
            }
        );
    });


    app.post(HTTPAction.SET_THEME, (req, res) => {
        res.cookie(THEME_COOKIE_NAME, req.body.themeId, {expires: new Date(Date.now() + 3600 * 24 * 365)});
        res.redirect(req.body.returnUrl);
    });

    app.get(HTTPAction.SOURCE_INFO, (req, res) => {
        const uiLang = getLangFromCookie(req, services.serverConf.langCookie, services.serverConf.languages).split('-')[0];
        const queryType = importQueryTypeString(getQueryValue(req, 'queryType')[0], QueryType.SINGLE_QUERY);
        const queryLang = getQueryValue(req, 'lang')[0];

        new Observable<IFreqDB>((observer) => {
            const db = services.db.getDatabase(queryType, queryLang);
            if (db === undefined) {
                observer.error(
                    newError(ErrorType.BAD_REQUEST, `Frequency database for [${queryLang}] not defined`));

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

    app.use(function (req, res, next) {
        const uiLang = getLangFromCookie(req, services.serverConf.langCookie, services.serverConf.languages);
        const [viewUtils,] = createHelperServices(services, uiLang);
        const error:[number, string] = [HTTP.Status.NotFound, viewUtils.translate('global__action_not_found')];
        const userConf = errorUserConf(services.serverConf.languages, error, uiLang);
        const clientConfig = emptyClientConf(services.clientConf, req.cookies[THEME_COOKIE_NAME]);
        clientConfig.colorThemes = [];
        const view = viewInit(viewUtils);
        const errView = errPageInit(viewUtils);
        res
            .status(HTTP.Status.NotFound)
            .send(renderResult({
                view,
                services: services,
                toolbarData: emptyValue(),
                queryMatches: [],
                themes: [],
                currTheme: clientConfig.colors.themeId,
                userConfig: userConf,
                clientConfig: clientConfig,
                returnUrl: mkReturnUrl(req, services.clientConf.rootUrl),
                rootView: errView,
                layout: [],
                homepageSections: [],
                isMobile: false, // TODO should we detect the mode on server too
                isAnswerMode: false,
                version: services.version,
                repositoryUrl: services.repositoryUrl,
                error: [HTTP.Status.NotFound, viewUtils.translate('global__action_not_found')]
            }));
    });
}