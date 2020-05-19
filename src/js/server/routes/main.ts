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
import { Dict, pipe, HTTP, List } from 'cnc-tskit';

import { IAppServices } from '../../appServices';
import { QueryType, QueryMatch, matchesPos, addWildcardMatches } from '../../common/query/index';
import { QueryValidator } from '../../common/query/valitation';
import { UserConf, ClientStaticConf, ClientConf, emptyClientConf, getSupportedQueryTypes,
         emptyLayoutConf, errorUserConf, getQueryTypeFreqDb, isTileDBConf, DEFAULT_WAIT_FOR_OTHER_TILES,
         THEME_COOKIE_NAME, getThemeList, getAppliedThemeConf, THEME_DEFAULT_NAME, UserQuery } from '../../conf';
import { init as viewInit } from '../../views/layout';
import { init as errPageInit } from '../../views/error';
import { ServerSideActionDispatcher } from '../core';
import { emptyValue } from '../toolbar/empty';
import { Services  } from '../actionServices';
import { loadFile } from '../files';
import { createRootComponent } from '../../app';
import { ActionName } from '../../models/actions';
import { DummyCache } from '../../cacheDb';
import { getLangFromCookie, fetchReqArgArray, createHelperServices, mkReturnUrl, logRequest, renderResult, fetchUrlParamArray } from './common';
import { maxQueryWordsForQueryType } from '../../layout';


function mkRuntimeClientConf(conf:ClientStaticConf, lang:string, themeId:string, appServices:IAppServices):Observable<ClientConf> {
    return forkJoin(...List.map(item =>
        appServices.importExternalText(
            item.contents,
            loadFile

        ).pipe(
            map<string, {label:string; html: string}>(value => ({
                label: appServices.importExternalMessage(item.label),
                html: value
            }))
        ),
        conf.homepage.tiles)
    ).pipe(
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
            colors: getAppliedThemeConf(conf, themeId),
            colorThemes: List.map(
                v => ({
                    themeId: v.themeId,
                    themeLabel: appServices.importExternalMessage(v.themeLabel),
                    description: appServices.importExternalMessage(v.description)
                }),
                getThemeList(conf)
            ),
            tiles: (typeof conf.tiles === 'string' || isTileDBConf(conf.tiles)) ?
                {} : // this should not happen at runtime (string or db config has been already used as uri to load a nested conf)
                pipe(
                    conf.tiles[lang],
                    Dict.map(item => ({waitForTimeoutSecs: DEFAULT_WAIT_FOR_OTHER_TILES, ...item}))
                ),
            layouts: {...emptyLayoutConf(), ...conf.layouts[lang]},
            searchLanguages: pipe(
                conf.searchLanguages,
                Dict.keys(),
                List.map(k => ({
                    code: k,
                    label: conf.searchLanguages[k],
                    queryTypes: getSupportedQueryTypes(conf, k)
                }))
            ),
            externalStyles: conf.externalStyles || [],
            issueReportingUrl: conf.issueReportingUrl,
            homepage: {
                tiles: item
            },
            telemetry: conf.telemetry,
            maxTileErrors: conf.maxTileErrors
        }))
    );
}

function compileQueries(q:Array<string>, pos:Array<Array<string>>, lemma:Array<string>):Array<UserQuery> {
    const ans:Array<UserQuery> = [];
    for (let i = 0; i < Math.max(q.length, pos.length, lemma.length); i++) {
        ans.push({word: q[i], pos: pos[i], lemma: lemma[i]});
    }
    return ans;
}

export function queryAction(services:Services, answerMode:boolean, queryType:QueryType, req:Request, res:Response, next:NextFunction) {

    const uiLang = getLangFromCookie(req, services.serverConf.langCookie, services.serverConf.languages);
    const dispatcher = new ServerSideActionDispatcher();
    const [viewUtils, appServices] = createHelperServices(services, uiLang);
    const validator = new QueryValidator(appServices);
    // until now there should be no exceptions throw

    new Observable<UserConf>(observer => {
        try {
            const queries = fetchUrlParamArray(req, 'query', queryType === QueryType.CMP_QUERY ? 2 : 1);
            const queryLang = fetchUrlParamArray(req, 'lang', queryType === QueryType.TRANSLAT_QUERY ? 2 : 1);
            const layouts = services.clientConf.layouts;
            if (answerMode && typeof layouts !== 'string') { // the type check is always true here (bad type design...)
                const maxQueryWords = maxQueryWordsForQueryType(layouts[queryLang[0]], queryType);
                List.forEach(
                    query => {
                        const validErrs = validator.validateQuery(query, maxQueryWords);
                        if (validErrs.length > 0) {
                            throw validErrs[0]; // we use only first error here
                        }
                    },
                    queries
                )
            }

            const userConfNorm:UserConf = {
                uiLang: uiLang,
                uiLanguages: services.serverConf.languages,
                query1Lang: queryLang[0] ? queryLang[0] : 'cs', // TODO default
                query2Lang: queryLang[1] ? queryLang[1] : 'en', // TODO default
                queryType: queryType,
                queries: compileQueries(
                    queries,
                    List.map(
                        v => List.filter(v => !!v, v.split(' ')),
                        fetchReqArgArray(req, 'pos', queries.length)
                    ),
                    fetchReqArgArray(req, 'lemma', queries.length)
                ),
                answerMode: answerMode
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
            runtimeConf: mkRuntimeClientConf(
                services.clientConf,
                userConf.query1Lang,
                req.cookies[THEME_COOKIE_NAME] || '',
                appServices
            ),
            logReq: logRequest( // we don't need the return value much here (see subscribe)
                services.queryLog,
                appServices.getISODatetime(),
                req,
                userConf
            ).pipe(catchError(
                (err:Error) => {
                    services.errorLog.error(err.message, {trace: err.stack});
                    return rxOf(0);
                }
            )),
            qMatchesEachQuery: rxOf(...List.map(
                    query => answerMode ?
                        services.db
                            .getDatabase(userConf.queryType, userConf.query1Lang)
                            .findQueryMatches(
                                appServices,
                                query.word,
                                getQueryTypeFreqDb(services.serverConf, userConf.queryType).minLemmaFreq
                            ) :
                        rxOf<Array<QueryMatch>>([]),
                    userConf.queries

                )).pipe(
                    concatMap(v => v),
                    reduce((acc:Array<Array<QueryMatch>>, curr) => acc.concat([curr]), [])
                )
            })
        )
    ).subscribe(
        ({userConf, hostPageEnv, runtimeConf, qMatchesEachQuery, appServices, dispatcher, viewUtils}) => {
            const queryMatchesExtended = List.map(
                (queryMatches, queryIdx) => {
                    const mergedMatches = addWildcardMatches([...queryMatches]);
                    if (mergedMatches.length > 0) {
                        let matchIdx = 0;
                        if (userConf.queries[queryIdx]) {
                            const srchIdx = List.findIndex(
                                v => matchesPos(v, userConf.queries[queryIdx].pos)
                                        && (v.lemma === userConf.queries[queryIdx].lemma || !userConf.queries[queryIdx].lemma),
                                mergedMatches
                            );
                            if (srchIdx >= 0) {
                                matchIdx = srchIdx;
                            }
                        }
                        mergedMatches[matchIdx] = {...mergedMatches[matchIdx], isCurrent: true};
                        return mergedMatches;

                    } else {
                        return [{
                            lemma: null,
                            word: userConf.queries[queryIdx].word,
                            pos: [],
                            abs: 0,
                            ipm: 0,
                            arf: 0,
                            flevel: null,
                            isCurrent: true,
                            isNonDict: true
                        }];
                    }
                },
                qMatchesEachQuery
            );
            const [rootView, layout,] = createRootComponent({
                config: runtimeConf,
                userSession: userConf,
                queryMatches: queryMatchesExtended,
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
                queryMatches: queryMatchesExtended,
                themes: runtimeConf.colorThemes,
                currTheme: runtimeConf.colors.themeId,
                userConfig: userConf,
                clientConfig: runtimeConf,
                returnUrl: mkReturnUrl(req, services.clientConf.rootUrl),
                rootView: rootView,
                layout: layout,
                homepageSections: [...runtimeConf.homepage.tiles],
                isMobile: false, // TODO should we detect the mode on server too
                isAnswerMode: answerMode,
                version: services.version,
                repositoryUrl: services.repositoryUrl
            }));
        },
        (err:Error) => {
            services.errorLog.error(err.message, {trace: err.stack});
            const error:[number, string] = [HTTP.Status.BadRequest, err.message];
            const userConf = errorUserConf(services.serverConf.languages, error, uiLang);
            const view = viewInit(viewUtils);
            const errView = errPageInit(viewUtils);
            const currTheme = getAppliedThemeConf(services.clientConf);
            res.send(renderResult({
                view: view,
                services: services,
                toolbarData: emptyValue(),
                queryMatches: [],
                themes: [],
                currTheme: currTheme ? currTheme.themeId : THEME_DEFAULT_NAME,
                userConfig: userConf,
                clientConfig: emptyClientConf(services.clientConf, req.cookies[THEME_COOKIE_NAME]),
                returnUrl: mkReturnUrl(req, services.clientConf.rootUrl),
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
    );
}