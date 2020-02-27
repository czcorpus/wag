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

import { AppServices } from '../../appServices';
import { encodeArgs } from '../../common/ajax';
import { ErrorType, mapToStatusCode, newError } from '../../common/errors';
import { QueryType, QueryMatch, importQueryPos, QueryPoS } from '../../common/query';
import { GlobalComponents } from '../../views/global';
import { findQueryMatches, getSimilarFreqWords, getWordForms } from '../freqdb/freqdb';

import { getLangFromCookie, fetchReqArgArray, createHelperServices, mkReturnUrl, renderResult } from './common';
import { mainAction } from './main';
import { WordDatabase, Services } from '../actionServices';
import { HTTPAction } from './actions';
import { TelemetryAction } from '../../common/types';
import { errorUserConf, emptyClientConf, THEME_COOKIE_NAME } from '../../conf';
import { init as viewInit } from '../../views/layout';
import { init as errPageInit } from '../../views/error';
import { emptyValue } from '../toolbar/empty';
import { HTTP } from 'cnc-tskit';


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
        mainAction(services, false, req, res, next);
    });

    app.get(HTTPAction.GET_LEMMAS, (req, res, next) => {
        const [,appServices] = createHelperServices(
            services, getLangFromCookie(req, services.serverConf.langCookie, services.serverConf.languages));

        new Observable<WordDatabase>((observer) => {
            const db = services.db.getDatabase(QueryType.SINGLE_QUERY, req.query.lang);
            if (db === undefined) {
                observer.error(
                    newError(ErrorType.BAD_REQUEST, `Frequency database for [${req.query.lang}] not defined`));

            } else {
                observer.next(db);
                observer.complete();
            }
        }).pipe(
            concatMap(
                (db) => {
                    return findQueryMatches(db, appServices, req.query.q, 1);
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
        res.cookie(services.serverConf.langCookie, req.body.lang, {maxAge: 3600 * 24 * 365});
        res.redirect(req.body.returnUrl);
    });

    app.get(HTTPAction.SEARCH, (req, res, next) => {
        // this just ensures backward compatibility
        if (req.url.includes('q1=') || req.url.includes('q2=')) {
            res.redirect(301, mkReturnUrl(req, services.clientConf.rootUrl).replace('q1=', 'q=').replace('q2=', 'q='));
            return;
        }
        mainAction(services, true, req, res, next);
    });

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
                lemmas: [],
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