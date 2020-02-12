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
import { Observable, forkJoin, of as rxOf } from 'rxjs';
import { concatMap, map, catchError, reduce } from 'rxjs/operators';


import { AppServices } from '../../appServices';
import { QueryType, LemmaVariant, QueryPoS, matchesPos, findMergeableLemmas, importQueryTypeString } from '../../common/query';
import { UserConf, ClientStaticConf, ClientConf, emptyClientConf, getSupportedQueryTypes, emptyLayoutConf, errorUserConf,
    getQueryTypeFreqDb, DEFAULT_WAIT_FOR_OTHER_TILES } from '../../conf';
import { init as viewInit } from '../../views/layout';
import { init as errPageInit } from '../../views/error';
import { ServerSideActionDispatcher } from '../core';
import { emptyValue } from '../toolbar/empty';
import { Services  } from '../actionServices';
import { getLemmas } from '../freqdb/freqdb';
import { loadFile } from '../files';
import { createRootComponent } from '../../app';
import { ActionName } from '../../models/actions';
import { DummyCache } from '../../cacheDb';
import { Dict, pipe } from '../../common/collections';
import { getLangFromCookie, fetchReqArgArray, createHelperServices, mkReturnUrl, logRequest, renderResult } from './common';



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

export function mainAction(services:Services, answerMode:boolean, req:Request, res:Response, next:NextFunction) {

    const uiLang = getLangFromCookie(req, services.serverConf.langCookie, services.serverConf.languages);
    const dispatcher = new ServerSideActionDispatcher();
    const [viewUtils, appServices] = createHelperServices(services, uiLang);
    // until now there should be no exceptions throw

    new Observable<UserConf>(observer => {
        try {
            const queryType = importQueryTypeString(req.query['queryType'], QueryType.SINGLE_QUERY);
            const minNumQueries = queryType === QueryType.CMP_QUERY ? 2 : 1;

            const userConfNorm:UserConf = {
                uiLang: uiLang,
                uiLanguages: services.serverConf.languages,
                query1Lang: req.query['lang1'] || 'cs', // TODO default
                query2Lang: req.query['lang2'] || 'en', // TODO default
                queryType: queryType,
                queryPos: fetchReqArgArray(req, 'pos', minNumQueries).map(v => v.split(',') as Array<QueryPoS>),
                queries: fetchReqArgArray(req, 'q', minNumQueries),
                lemma: fetchReqArgArray(req, 'lemma', minNumQueries),
                answerMode: answerMode,
                error: null
            };

            observer.next(userConfNorm);
            observer.complete();

        } catch (err) {
            observer.error(err);
        }

    }).pipe(
        concatMap(userConf => forkJoin({
            appServices: rxOf(appServices),
            dispatcher: rxOf(dispatcher),
            viewUtils: rxOf(viewUtils),
            userConf: new Observable<UserConf>(
                (observer) => {
                    if (userConf.queryType === QueryType.TRANSLAT_QUERY && userConf.query1Lang === userConf.query2Lang) {
                        userConf.error = [400, appServices.translate('global__src_and_dst_langs_must_be_different')];
                    }
                    observer.next(userConf);
                    observer.complete();
                }
            ),
            hostPageEnv: services.toolbar.get(userConf.uiLang, mkReturnUrl(req, services.clientConf.rootUrl), req.cookies, viewUtils),
            runtimeConf: mkRuntimeClientConf(services.clientConf, userConf.query1Lang, appServices),
            logReq: logRequest( // we don't need the return value much here (see subscribe)
                services.logging,
                appServices.getISODatetime(),
                req,
                userConf
            ).pipe(catchError(
                (err:Error) => {
                    services.errorLog.error(err.message, {trace: err.stack});
                    return rxOf(0);
                }
            )),
            lemmasEachQuery: rxOf(...userConf.queries
                    .map(query => answerMode ?
                        getLemmas(
                            services.db.getDatabase(userConf.queryType, userConf.query1Lang),
                            appServices,
                            query,
                            getQueryTypeFreqDb(services.serverConf, userConf.queryType).minLemmaFreq
                        ) :
                        rxOf<Array<LemmaVariant>>([])

                    )).pipe(
                        concatMap(v => v),
                        reduce((acc:Array<Array<LemmaVariant>>, curr) => acc.concat([curr]), [])

                    )
            })
        )
    ).subscribe(
        ({userConf, hostPageEnv, runtimeConf, lemmasEachQuery, appServices, dispatcher, viewUtils}) => {
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
                        word: userConf.queries[queryIdx],
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
            const [rootView, layout,] = createRootComponent({
                config: runtimeConf,
                userSession: userConf,
                lemmas: lemmasExtended,
                appServices: appServices,
                dispatcher: dispatcher,
                onResize: new Observable((_) => undefined),
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
                isAnswerMode: answerMode,
                error: null
            }));
        },
        (err:Error) => {
            services.errorLog.error(err.message, {trace: err.stack});
            const userConf = errorUserConf(services.serverConf.languages, 400, String(err));
            const view = viewInit(viewUtils);
            const errView = errPageInit(viewUtils);
            res.send(renderResult({
                view: view,
                services: services,
                toolbarData: emptyValue(),
                lemmas: [],
                userConfig: userConf,
                clientConfig: emptyClientConf(services.clientConf),
                returnUrl: mkReturnUrl(req, services.clientConf.rootUrl),
                rootView: errView,
                layout: [],
                homepageSections: [],
                isMobile: false, // TODO should we detect the mode on server too
                isAnswerMode: false,
                error: [400, err.message] // TODO code
            }));
        }
    );
}