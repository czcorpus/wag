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
import { Observable, forkJoin} from 'rxjs';
import { concatMap, map } from 'rxjs/operators';
import * as Immutable from 'immutable';


import { AppServices } from '../appServices';
import { encodeArgs } from '../common/ajax';
import { ErrorType, mapToStatusCode, newError } from '../common/errors';
import { HostPageEnv, AvailableLanguage } from '../common/hostPage';
import { QueryType, LemmaVariant, importQueryPos, QueryPoS } from '../common/query';
import { UserConf, ClientStaticConf, ClientConf, emptyClientConf } from '../conf';
import { defaultFactory as mainFormFactory } from '../models/query';
import { GlobalComponents } from '../views/global';
import { init as viewInit, LayoutProps } from '../views/layout';
import { ServerSideActionDispatcher } from './core';
import { emptyValue } from './toolbar/empty';
import { Services } from './actionServices';
import { getLemmas, getSimilarFreqWords } from './freqdb/freqdb';
import { loadFile } from './files';


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
            dbValuesMapping: conf.dbValuesMapping,
            apiHeaders: conf.apiHeaders,
            colors: conf.colors,
            tiles: conf.tiles[lang],
            layouts: conf.layouts,
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
}

function renderResult({view, services, toolbarData, lemmas, userConfig, clientConfig, returnUrl}:RenderResultArgs):string {
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
                homepageTiles: Immutable.List<{label:string; html:string}>(clientConfig.homepage.tiles)
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
        actionUrlCreator: (path, args) => services.clientConf.hostUrl + path + '?' + encodeArgs(args)
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
            apiHeadersMapping: services.clientConf.apiHeaders || {}
        })
    ];
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

function mainAction(services:Services, answerMode:boolean, req:Request, res:Response, next:NextFunction) {

    const userConfig:UserConf = {
        uiLang: getLangFromCookie(req, services.serverConf.langCookie, services.serverConf.languages),
        uiLanguages: services.serverConf.languages,
        query1Lang: req.query['lang1'] || 'cs',
        query2Lang: req.query['lang2'] || 'en',
        queryType: req.query['queryType'] || 'single',
        queryPos: req.query['pos'],
        lemma1: req.query['lemma1'] || '',
        query1: req.query['q1'] || '',
        query2: req.query['q2'] || '',
        answerMode: answerMode
    };

    const dispatcher = new ServerSideActionDispatcher();

    const [viewUtils, appServices] = createHelperServices(services, userConfig.uiLang);

    const mainFormModel = mainFormFactory({
        dispatcher: dispatcher,
        appServices: appServices,
        query1: userConfig.query1,
        query1Lang: userConfig.query1Lang || '',
        query2: userConfig.query2,
        query2Lang: userConfig.query2Lang || '',
        queryType: userConfig.queryType as QueryType,
        lemmas: [],
        isAnswerMode: answerMode,
        uiLanguages: Immutable.List<AvailableLanguage>(
            Object.keys(services.serverConf.languages).map(k => [k, services.serverConf.languages[k]]))
    });
    const view = viewInit(dispatcher, viewUtils, mainFormModel);

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
        getLemmas(services.db[userConfig.query1Lang], appServices, userConfig.query1),
        mkRuntimeClientConf(services.clientConf, userConfig.query1Lang, appServices)
    )
    .subscribe(
        (ans) => {
            const [userSession, toolbar, lemmas, clientConf] = ans;
            let currentFlagSolved = false;
            if (lemmas.length > 0) {
                if (userSession.queryPos) {
                    const srchIdx = lemmas.findIndex(v => v.pos === userSession.queryPos && (v.lemma === userSession.lemma1 || !userSession.lemma1));
                    if (srchIdx > -1) {
                        lemmas[srchIdx].isCurrent = true;
                    }
                    currentFlagSolved = true; // even if we do not set anything (error detected on client)
                }
                if (!currentFlagSolved) {
                    const numExact = lemmas.reduce((acc, curr) => curr.lemma === userSession.query1 ? acc + 1 : acc, 0);
                    if (numExact > 0) {
                        const exactMatchIdx = lemmas.findIndex(v => v.lemma === userSession.query1);
                        lemmas[exactMatchIdx].isCurrent = true;

                    } else {
                        lemmas[0].isCurrent = true;
                    }
                }
            }
            res.send(renderResult({
                view: view,
                services: services,
                toolbarData: toolbar,
                lemmas: lemmas,
                userConfig: userSession,
                clientConfig: clientConf,
                returnUrl: mkReturnUrl(req, services.clientConf.rootUrl)
            }));
        },
        (err) => {
            console.log(err);
            userConfig.error = String(err);
            res.send(renderResult({
                view: view,
                services: services,
                toolbarData: emptyValue(),
                lemmas: [],
                userConfig: userConfig,
                clientConfig: emptyClientConf(services.clientConf),
                returnUrl: mkReturnUrl(req, services.clientConf.rootUrl)
            }));
        }
    );
}

export const wdgRouter = (services:Services) => (app:Express) => {

    // host page generator with some React server rendering (testing phase)
    app.get('/', (req, res, next) => mainAction(services, false, req, res, next));

    app.post('/set-ui-lang/', (req, res, next) => {
        res.cookie(services.serverConf.langCookie, req.body.lang, {maxAge: 3600 * 24 * 365});
        res.redirect(req.body.returnUrl);
    });

    app.get('/search/', (req, res, next) => mainAction(services, true, req, res, next));

    app.get('/get-lemmas/', (req, res, next) => {
        const [viewUtils, appServices] = createHelperServices(services, 'cs-CZ'); // TODO lang

        new Observable<{lang:string}>((observer) => {
            if (Object.keys(services.db).indexOf(req.query.lang) === -1) {
                observer.error(
                    newError(ErrorType.BAD_REQUEST, `Frequency database for [${req.query.lang}] not defined`));

            } else {

            }
        }).pipe(
            concatMap(
                (conf) => {
                    return getLemmas(services.db[conf.lang], appServices, req.query.q);
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
    app.get('/similar-freq-words/', (req, res) => {

        const viewUtils = new ViewUtils<GlobalComponents>({
            uiLang: 'cs-CZ',
            translations: services.translations,
            staticUrlCreator: (path) => services.clientConf.rootUrl + 'assets/' + path,
            actionUrlCreator: (path, args) => services.clientConf.hostUrl + path + '?' + encodeArgs(args)
        });
        const appServices = new AppServices({
            notifications: null, // TODO
            uiLang: 'cs-CZ', // TODO
            translator: viewUtils,
            staticUrlCreator: viewUtils.createStaticUrl,
            actionUrlCreator: viewUtils.createActionUrl,
            dbValuesMapping: services.clientConf.dbValuesMapping || {},
            apiHeadersMapping: services.clientConf.apiHeaders || {}
        });

        new Observable<{lang:string; word:string; lemma:string; pos:QueryPoS; rng:number}>((observer) => {
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
                    pos: importQueryPos(req.query.pos),
                    rng: Math.min(req.query.srchRange, services.serverConf.auxServices.similarFreqWordsMaxCtx)
                });
                observer.complete();
            }
        }).pipe(
            concatMap(
                (data) => {
                    return getSimilarFreqWords(
                        services.db[data.lang],
                        appServices,
                        data.lang,
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
        )
    });
}