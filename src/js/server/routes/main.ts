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
import { Request, Response, NextFunction } from 'express';
import { Observable, forkJoin, of as rxOf } from 'rxjs';
import { catchError, concatMap, map, reduce, tap } from 'rxjs/operators';
import { Dict, pipe, HTTP, List } from 'cnc-tskit';

import { IAppServices } from '../../appServices';
import { QueryType, QueryMatch, matchesPos, addWildcardMatches } from '../../query/index';
import { QueryValidator } from '../../query/validation';
import { UserConf, ClientStaticConf, ClientConf, emptyClientConf, getSupportedQueryTypes,
         emptyLayoutConf, errorUserConf, getQueryTypeFreqDb, isTileDBConf, DEFAULT_WAIT_FOR_OTHER_TILES,
         THEME_COOKIE_NAME, getThemeList, getAppliedThemeConf, UserQuery, ServerConf, GroupedAuth } from '../../conf';
import { init as viewInit } from '../../views/layout/layout';
import { init as errPageInit } from '../../views/error';
import { ServerSideActionDispatcher } from '../core';
import { emptyValue } from '../toolbar/empty';
import { Services  } from '../actionServices';
import { loadFile } from '../files';
import { createRootComponent } from '../../app';
import { initDummyStore } from '../../page/cache/index';
import { fetchReqArgArray, createHelperServices, mkPageReturnUrl, renderResult, fetchUrlParamArray,
    clientIsLikelyMobile } from './common';
import { maxQueryWordsForQueryType } from '../../conf/validation';
import { Actions } from '../../models/actions';
import { HTTPAction } from './actions';
import { logAction } from '../actionLog/common';
import { fullServerHttpRequest, serverHttpRequest } from '../request';


interface MkRuntimeClientConfArgs {
    conf:ClientStaticConf;
    serverConf:ServerConf;
    domain:string;
    themeId:string;
    appServices:IAppServices;
}

function mkRuntimeClientConf({
    conf,
    serverConf,
    domain,
    themeId,
    appServices
}:MkRuntimeClientConfArgs):Observable<ClientConf> {

    return forkJoin([
        forkJoin(
            List.map(item =>
                appServices.importExternalText(
                    item.contents,
                    loadFile

                ).pipe(
                    map<string, {label:string; html: string}>(value => ({
                        label: appServices.importExternalMessage(item.label),
                        html: value
                    }))
                ),
                conf.homepage.tiles
            )
        ),
        conf.homepage.footer ?
            appServices.importExternalText(conf.homepage.footer, loadFile) : rxOf(undefined)
    ]).pipe(
        map(([tiles, footer]) => {
            let maxQueryWords = {};
            for (let queryType in QueryType) {
                const qt = QueryType[queryType]
                maxQueryWords[qt] = serverConf.freqDB[qt] ? serverConf.freqDB[qt].maxQueryWords : 1;
            }

            return {
                rootUrl: conf.rootUrl,
                hostUrl: conf.hostUrl,
                runtimeAssetsUrl: conf.runtimeAssetsUrl,
                favicon: conf.favicon,
                logo: conf.logo,
                corpInfoApiUrl: conf.corpInfoApiUrl,
                apiHeaders: conf.apiHeaders,
                reqCacheTTL: conf.reqCacheTTL,
                onLoadInit: conf.onLoadInit,
                dataReadability: typeof conf.dataReadability === 'string' ?
                    {metadataMapping: {}, commonStructures: {}} :
                    conf.dataReadability,
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
                        conf.tiles[domain],
                        Dict.map(item => ({waitForTimeoutSecs: DEFAULT_WAIT_FOR_OTHER_TILES, ...item}))
                    ),
                layouts: {...emptyLayoutConf(), ...conf.layouts[domain]},
                searchDomains: pipe(
                    conf.searchDomains,
                    Dict.keys(),
                    List.map(k => ({
                        code: k,
                        label: conf.searchDomains[k],
                        queryTypes: getSupportedQueryTypes(conf, k)
                    }))
                ),
                externalStyles: conf.externalStyles || [],
                issueReportingUrl: conf.issueReportingUrl,
                homepage: {
                    tiles,
                    footer
                },
                telemetry: conf.telemetry,
                maxTileErrors: conf.maxTileErrors,
                maxQueryWords: maxQueryWords
            }
        })
    );
}

function compileQueries(q:Array<string>, pos:Array<Array<string>>, lemma:Array<string>):Array<UserQuery> {
    const ans:Array<UserQuery> = [];
    for (let i = 0; i < Math.max(q.length, pos.length, lemma.length); i++) {
        ans.push({word: q[i], pos: pos[i], lemma: lemma[i]});
    }
    return ans;
}

interface ImportQueryReqArgs {
    services:Services;
    appServices:IAppServices;
    req:Request;
    queryType:QueryType;
    uiLang:string;
    answerMode:boolean;
}

export function importQueryRequest({services, appServices, req, queryType, uiLang, answerMode}:ImportQueryReqArgs):Observable<UserConf> {
    const validator = new QueryValidator(appServices);
    return new Observable<UserConf>(observer => {
        try {
            const queries = fetchUrlParamArray(req, 'query', queryType === QueryType.CMP_QUERY ? 2 : 1);
            const queryDomain = fetchUrlParamArray(req, 'domain', queryType === QueryType.TRANSLAT_QUERY ? 2 : 1);
            const layouts = services.clientConf.layouts;
            if (answerMode && typeof layouts !== 'string') { // the type check is always true here (bad type design...)
                const maxQueryWords = maxQueryWordsForQueryType(services.serverConf, queryType);
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
            const domains = Dict.keys(services.clientConf.searchDomains);
            const dfltDomain = List.head(domains);
            const dfltDomain2 = domains.length > 1 ? domains[1] : '';
            const userConfNorm:UserConf = {
                uiLang,
                uiLanguages: services.serverConf.languages,
                query1Domain: queryDomain[0] ? queryDomain[0] : dfltDomain, // TODO this is not queryType sensitive
                query2Domain: queryDomain[1] ? queryDomain[1] : dfltDomain2,
                queryType,
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
    })
}

function testGroupedAuth(
    currResp:Response,
    req:Request,
    items:Array<GroupedAuth>
):Observable<any> {
    return rxOf(...items).pipe(
        concatMap(
            item => serverHttpRequest<any>({
                url: item.preflightUrl,
                method: HTTP.Method.GET,
                cookies: req.cookies
            }).pipe(
                map(
                    resp => ({authorized: true, conf: item})
                ),
                catchError(
                    err => {
                        return rxOf({authorized: false, conf: item})
                    }
                )
            )
        ),
        concatMap(
            ({authorized, conf}) => {
                return authorized ?
                    rxOf(true) :
                     fullServerHttpRequest<any>({
                        url: conf.authenticateUrl,
                        method: HTTP.Method.POST,
                        data: {
                            personal_access_token:  conf.token
                        },
                        headers: {
                            'content-type': 'application/x-www-form-urlencoded'
                        }
                    }).pipe(
                        map(
                            resp => {
                                const cookies = resp.headers['set-cookie'];
                                if (cookies) {
                                    currResp.header('set-cookie', cookies);
                                }
                                return true;
                            }
                        )
                    );
            }
        )
    );
}

export interface QueryActionArgs {
    services:Services;
    answerMode:boolean;
    httpAction:HTTPAction;
    queryType:QueryType;
    uiLang:string;
    req:Request;
    res:Response;
    next:NextFunction;
}

export function queryAction({
    services,
    answerMode,
    httpAction,
    queryType,
    uiLang,
    req,
    res,
    next
}:QueryActionArgs) {

    const dispatcher = new ServerSideActionDispatcher();
    const [viewUtils, appServices] = createHelperServices(services, uiLang);
    // until now there should be no exceptions throw
    importQueryRequest({
        services, appServices, req, queryType, uiLang, answerMode
    }).pipe(
        concatMap(userConf => forkJoin({
            appServices: rxOf(appServices),
            dispatcher: rxOf(dispatcher),
            viewUtils: rxOf(viewUtils),
            userConf: new Observable<UserConf>(
                (observer) => {
                    if (userConf.queryType === QueryType.TRANSLAT_QUERY && userConf.query1Domain === userConf.query2Domain) {
                        userConf.error = [400, appServices.translate('global__src_and_dst_domains_must_be_different')];
                    }
                    observer.next(userConf);
                    observer.complete();
                }
            ),
            hostPageEnv: services.toolbar.get(userConf.uiLang, mkPageReturnUrl(req, services.clientConf.rootUrl), req.cookies, viewUtils),
            runtimeConf: mkRuntimeClientConf({
                conf: services.clientConf,
                serverConf: services.serverConf,
                domain: userConf.query1Domain,
                themeId: req.cookies[THEME_COOKIE_NAME] || '',
                appServices
            }),
            groupedAuth: testGroupedAuth(
                res,
                req,
                services.serverConf.groupedAuth || []),
            qMatchesEachQuery: rxOf(...List.map(
                    query => answerMode ?
                        services.db
                            .getDatabase(userConf.queryType, userConf.query1Domain)
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
        ),
        // log action
        tap(({appServices, hostPageEnv, userConf}) => {
            logAction({
                actionWriter: services.actionWriter,
                req,
                httpAction,
                datetime: appServices.getISODatetime(),
                userId: hostPageEnv.userId,
                userConf,
                isMobileClient: clientIsLikelyMobile(req)
            }).subscribe();
        })
    ).subscribe({
        next: ({userConf, hostPageEnv, runtimeConf, qMatchesEachQuery, appServices, dispatcher, viewUtils}) => {
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
                cache: initDummyStore('dummy-server-store')
            });

            const {HtmlHead, HtmlBody} = viewInit(viewUtils);
            // Here we're going to use the fact that (the current)
            // server-side action dispatcher does not trigger side effects
            // so our models just set 'busy' state and nothing else happens.
            // The execution is synchronous here too.

            dispatcher.dispatch<typeof Actions.RequestQueryResponse>({
                name: Actions.RequestQueryResponse.name
            });

            res.send(renderResult({
                HtmlBody,
                HtmlHead,
                services,
                toolbarData: hostPageEnv,
                queryMatches: queryMatchesExtended,
                themes: runtimeConf.colorThemes,
                currTheme: runtimeConf.colors.themeId,
                userConfig: userConf,
                clientConfig: runtimeConf,
                returnUrl: mkPageReturnUrl(req, services.clientConf.rootUrl),
                rootView,
                layout,
                homepageSections: [...runtimeConf.homepage.tiles],
                isMobile: false, // TODO should we detect the mode on server too
                isAnswerMode: answerMode,
                version: services.version,
                repositoryUrl: services.repositoryUrl
            }));
        },
        error: (err:Error) => {
            services.errorLog.error(err.message, {trace: err.stack});
            const error:[number, string] = [HTTP.Status.BadRequest, err.message];
            const userConf = errorUserConf(services.serverConf.languages, error, uiLang);
            const { HtmlHead, HtmlBody } = viewInit(viewUtils);
            const errView = errPageInit(viewUtils);
            const currTheme = getAppliedThemeConf(services.clientConf);
            res.send(renderResult({
                HtmlBody,
                HtmlHead,
                services: services,
                toolbarData: emptyValue(),
                queryMatches: [],
                themes: [],
                currTheme: currTheme.themeId,
                userConfig: userConf,
                clientConfig: emptyClientConf(services.clientConf, req.cookies[THEME_COOKIE_NAME]),
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
    });
}