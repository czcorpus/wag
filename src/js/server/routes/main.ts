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
import { concatMap, defaultIfEmpty, map, reduce, tap } from 'rxjs/operators';
import { pipe, HTTP, List, Rx, tuple, Dict } from 'cnc-tskit';

import { IAppServices } from '../../appServices.js';
import {
    QueryType,
    QueryMatch,
    matchesPos,
    addWildcardMatches,
    queryTypeToAction,
    LemmatizationLevel,
} from '../../query/index.js';
import { QueryValidator } from '../../query/validation.js';
import {
    UserConf,
    ClientStaticConf,
    ClientConf,
    emptyClientConf,
    errorUserConf,
    isTileDBConf,
    THEME_COOKIE_NAME,
    getThemeList,
    getAppliedThemeConf,
    UserQuery,
    ServerConf,
    mergeToEmptyLayoutConf,
    MainPosAttrValues,
    LAST_USED_TRANSLAT_LANG_COOKIE_NAME,
    LayoutsConfig,
    HomepageTileConf,
    GroupLayoutConfig,
    LayoutConfigCmpQuery,
} from '../../conf/index.js';
import { init as viewInit } from '../../views/layout/layout.js';
import { init as errPageInit } from '../../views/error.js';
import { ServerSideActionDispatcher } from '../core.js';
import { emptyValue } from '../toolbar/empty.js';
import { Services } from '../actionServices.js';
import { loadFile } from '../files.js';
import { createRootComponent } from '../../app.js';
import {
    fetchReqArgArray,
    createHelperServices,
    mkPageReturnUrl,
    renderResult,
    fetchUrlParamArray,
    clientIsLikelyMobile,
} from './common.js';
import { maxQueryWordsForQueryType } from '../../conf/validation.js';
import { Actions } from '../../models/actions.js';
import { HTTPAction } from '../../page/actions.js';
import { logAction } from '../actionLog/common.js';
import { LayoutManager } from '../../page/layout.js';
import { attachNumericTileIdents } from '../../page/index.js';
import { createInstance, FreqDBType } from '../freqdb/factory.js';
import { TileConf } from '../../page/tile.js';
import { queriesConf, previewLayoutConf } from '../../conf/preview.js';
import { Theme } from '../../page/theme.js';

interface MkRuntimeClientConfArgs {
    conf: ClientStaticConf;
    serverConf: ServerConf;
    themeId: string;
    appServices: IAppServices;
    queryType: QueryType;
    lemmatizationLevel: LemmatizationLevel;
}

/**
 * Out of all the configured tiles for all the query types, filter out everything
 * except for the provided query type.
 */
function filterTilesByQueryType(
    layouts: LayoutsConfig,
    tiles: { [ident: string]: TileConf },
    qType: QueryType
): { [tileId: string]: TileConf } {
    return pipe(
        Object.entries(layouts),
        List.filter(([qt]) => qt === qType),
        List.flatMap(([, layout]) => layout.groups as Array<GroupLayoutConfig>),
        List.flatMap((x) => (typeof x !== 'string' ? x.tiles : [])),
        List.map((x) => tuple(x.tile, tiles[x.tile])),
        Dict.fromEntries()
    );
}

/**
 * Based on the static configuration, current query and other runtime
 * information, generate request-specific configuration for the client.
 */
export function mkRuntimeClientConf({
    conf,
    serverConf,
    themeId,
    appServices,
    queryType,
    lemmatizationLevel,
}: MkRuntimeClientConfArgs): Observable<ClientConf> {
    const layouts: LayoutsConfig = {
        ...mergeToEmptyLayoutConf(
            typeof conf.layouts !== 'string' ? conf.layouts : {}
        ),
        preview: {
            groups: previewLayoutConf,
            mainPosAttr: 'pos',
            targetLanguages: [{ code: 'en', label: 'English' }],
        },
    };

    const tiles = filterTilesByQueryType(
        layouts,
        typeof conf.tiles !== 'string' && !isTileDBConf(conf.tiles)
            ? conf.tiles
            : {},
        queryType
    );

    return forkJoin([
        forkJoin(
            List.map(
                (item) =>
                    appServices
                        .importExternalText(item.contents, loadFile)
                        .pipe(
                            map<string, { label: string; html: string }>(
                                (value) => ({
                                    label: appServices.importExternalMessage(
                                        item.label
                                    ),
                                    html: value,
                                    isFooterIntegrated: item.isFooterIntegrated,
                                })
                            )
                        ),
                conf.homepage.tiles
            )
        ).pipe(
            defaultIfEmpty<Array<HomepageTileConf>, Array<HomepageTileConf>>([])
        ),
        conf.homepage.footer
            ? appServices.importExternalText(conf.homepage.footer, loadFile)
            : rxOf(undefined),
    ]).pipe(
        map(([hpTiles, footer]) => {
            return {
                rootUrl: conf.rootUrl,
                hostUrl: conf.hostUrl,
                runtimeAssetsUrl: conf.runtimeAssetsUrl,
                favicon: conf.favicon,
                logo: {
                    url: appServices.importExternalMessage(conf.logo?.url),
                    inlineStyleDesktop: appServices.importExternalMessage(
                        conf.logo?.inlineStyleDesktop
                    ),
                    inlineStyleMobile: appServices.importExternalMessage(
                        conf.logo?.inlineStyleMobile
                    ),
                    label: appServices.importExternalMessage(conf.logo?.label),
                    subWag: conf.logo?.subWag
                        ? {
                              url: appServices.importExternalMessage(
                                  conf.logo.subWag.url
                              ),
                              inlineStyleDesktop:
                                  appServices.importExternalMessage(
                                      conf.logo.subWag?.inlineStyleDesktop
                                  ),
                              inlineStyleMobile:
                                  appServices.importExternalMessage(
                                      conf.logo.subWag?.inlineStyleMobile
                                  ),
                              label: appServices.importExternalMessage(
                                  conf.logo.subWag.label
                              ),
                          }
                        : undefined,
                },
                instanceSwitchMenu: List.map(
                    (item) => ({
                        url: item.url,
                        label: appServices.importExternalMessage(item.label),
                    }),
                    Array.isArray(conf.instanceSwitchMenu)
                        ? conf.instanceSwitchMenu
                        : []
                ),
                apiHeaders: conf.apiHeaders,
                onLoadInit: conf.onLoadInit,
                dataReadability:
                    typeof conf.dataReadability === 'string'
                        ? { metadataMapping: {}, commonStructures: {} }
                        : conf.dataReadability,
                colors: getAppliedThemeConf(conf, themeId),
                colorThemes: List.map(
                    (v) => ({
                        themeId: v.themeId,
                        themeLabel: appServices.importExternalMessage(
                            v.themeLabel
                        ),
                        description: v.description
                            ? appServices.importExternalMessage(v.description)
                            : '',
                    }),
                    getThemeList(conf)
                ),
                dataStreamingUrl: conf.dataStreamingUrl,
                tiles,
                layouts,
                queryTypes:
                    typeof conf.layouts !== 'string'
                        ? pipe(
                              [
                                  tuple(conf.layouts.cmp, 'cmp'),
                                  tuple(conf.layouts.single, 'single'),
                                  tuple(conf.layouts.translat, 'translat'),
                              ],
                              List.filter(([tst]) => !!tst),
                              List.map<
                                  [LayoutConfigCmpQuery, QueryType],
                                  QueryType
                              >(([, v]) => v)
                          )
                        : ['single'],
                externalStyles: conf.externalStyles || [],
                issueReportingUrl: conf.issueReportingUrl,
                homepage: {
                    tiles: hpTiles,
                    footer,
                    wordCloud: {
                        url: conf.homepage?.wordCloud?.url,
                        label: appServices.importExternalMessage(
                            conf.homepage?.wordCloud?.label
                        ),
                    },
                },
                maxTileErrors: conf.maxTileErrors,
                maxQueryWords: serverConf.freqDB.maxQueryWords,
                hideUnavailableQueryTypes: conf.hideUnavailableQueryTypes,
                supportsExactFormSearch: !conf.disableExactFormSearchOption,
            };
        })
    );
}

function compileQueries(
    q: Array<string>,
    pos: Array<Array<string>>,
    lemma: Array<string>,
    sublemma: Array<string>
): Array<UserQuery> {
    const ans: Array<UserQuery> = [];
    for (
        let i = 0;
        i < Math.max(q.length, pos.length, lemma.length, sublemma.length);
        i++
    ) {
        ans.push({
            word: q[i],
            pos: pos[i],
            lemma: lemma[i],
            sublemma: sublemma[i],
        });
    }
    return ans;
}

interface ImportQueryReqArgs {
    services: Services;
    appServices: IAppServices;
    req: Request;
    queryType: QueryType;
    lemmatizationLevel: LemmatizationLevel;
    uiLang: string;
    answerMode: boolean;
}

function determineTranslatLang(
    req: Request,
    queryType: QueryType,
    layoutsConf: LayoutsConfig
): string | undefined {
    if (queryType === 'cmp' || queryType === 'single') {
        return undefined;
    }

    if (queryType === 'preview') {
        // the preview mode has target languages hardcoded,
        // so we can be pretty sure about len > 0
        return layoutsConf.preview.targetLanguages[0].code;
    }
    if (req.params['lang']) {
        return req.params['lang'];
    }
    if (req.cookies[LAST_USED_TRANSLAT_LANG_COOKIE_NAME]) {
        return req.cookies[LAST_USED_TRANSLAT_LANG_COOKIE_NAME];
    }
    if (
        Array.isArray(layoutsConf.translat.targetLanguages) &&
        layoutsConf.translat.targetLanguages.length > 0
    ) {
        return layoutsConf.translat.targetLanguages[0].code;
    }
    return undefined;
}

export function importQueryRequest({
    services,
    appServices,
    req,
    queryType,
    lemmatizationLevel,
    uiLang,
    answerMode,
}: ImportQueryReqArgs): Observable<UserConf> {
    const validator = new QueryValidator(appServices);
    return new Observable<UserConf>((observer) => {
        try {
            const queries = answerMode
                ? fetchUrlParamArray(req, 'query', queryType === 'cmp' ? 2 : 1)
                : pipe(
                      Array.isArray(req.query.q) ? req.query.q : [req.query.q],
                      List.map((v) => {
                          if (typeof v === 'string') {
                              return v;
                          }
                          return '';
                      }),
                      (items) =>
                          queryType === 'cmp'
                              ? List.concat(
                                    List.repeat((_) => '', 2 - items.length),
                                    items
                                )
                              : items
                  );
            const layouts = services.clientConf.layouts;
            if (
                queryType !== 'preview' &&
                answerMode &&
                typeof layouts !== 'string'
            ) {
                // the type check is always true here (bad type design...)
                const maxQueryWords = maxQueryWordsForQueryType(
                    services.serverConf,
                    queryType
                );
                List.forEach((query) => {
                    const validErrs = validator.validateQuery(
                        query,
                        maxQueryWords
                    );
                    if (validErrs.length > 0) {
                        throw validErrs[0]; // we use only first error here
                    }
                }, queries);
            }
            const userConfNorm: UserConf = {
                applicationId: services.clientConf.applicationId,
                uiLang,
                uiLanguages: services.serverConf.languages,
                translatLanguage: undefined, // here we cannot determine the language yet!
                queryType,
                lemmatizationLevel,
                queries:
                    queryType === 'preview'
                        ? queriesConf
                        : compileQueries(
                              queries,
                              List.map(
                                  (v) => List.filter((v) => !!v, v.split(' ')),
                                  fetchReqArgArray(req, 'pos', queries.length)
                              ),
                              fetchReqArgArray(req, 'lemma', queries.length),
                              fetchReqArgArray(req, 'sublemma', queries.length)
                          ),
                answerMode: answerMode,
            };

            observer.next(userConfNorm);
            observer.complete();
        } catch (err) {
            observer.error(err);
        }
    });
}

/**
 * note: functions expects availMatches sorted from highest ipm to lowest
 */
export function determineCurrentMatch(
    userQuery: UserQuery,
    lemmatizationLevel: LemmatizationLevel,
    posAttr: MainPosAttrValues,
    availMatches: Array<QueryMatch>
): Array<QueryMatch> {
    if (List.size(availMatches) === 0) {
        return availMatches;
    }

    const applicableMatches =
        lemmatizationLevel === 'form'
            ? pipe(
                  availMatches,
                  List.filter(
                      (x) =>
                          !!List.find(
                              // we always compare forms lowercase; more precision in
                              // matching is determined by comparing (sub)lemmas
                              (x2) =>
                                  x2.word.toLowerCase() ===
                                  userQuery.word.toLowerCase(),
                              x.forms
                          )
                  )
              )
            : availMatches;
    if (userQuery.lemma && userQuery.sublemma && !List.empty(userQuery.pos)) {
        const srch = List.findIndex(
            (x) =>
                matchesPos(x, posAttr, userQuery.pos) &&
                userQuery.lemma === x.lemma &&
                userQuery.sublemma === x.sublemma,
            applicableMatches
        );
        if (srch > -1) {
            applicableMatches[srch].isCurrent = true;
            return applicableMatches;
        }
    }
    if (userQuery.lemma && !List.empty(userQuery.pos)) {
        const srch = List.findIndex(
            (x) =>
                matchesPos(x, posAttr, userQuery.pos) &&
                userQuery.lemma === x.lemma,
            applicableMatches
        );
        if (srch > -1) {
            applicableMatches[srch].isCurrent = true;
            return applicableMatches;
        }
    }
    if (userQuery.lemma) {
        const srch = List.findIndex(
            (x) => userQuery.lemma === x.lemma,
            applicableMatches
        );
        if (srch > -1) {
            applicableMatches[srch].isCurrent = true;
            return applicableMatches;
        }
    }

    applicableMatches[0].isCurrent = true;
    return applicableMatches;
}

export interface QueryActionArgs {
    services: Services;
    answerMode: boolean;
    httpAction: HTTPAction;
    queryType: QueryType;
    lemmatizationLevel: LemmatizationLevel;
    uiLang: string;
    req: Request;
    res: Response;
    next: NextFunction;
}

export function queryAction({
    services,
    answerMode,
    httpAction,
    queryType,
    lemmatizationLevel,
    uiLang,
    req,
    res,
    next,
}: QueryActionArgs) {
    const dispatcher = new ServerSideActionDispatcher();
    const [viewUtils, appServices] = createHelperServices(
        services,
        uiLang,
        queryType
    );
    const freqDb = createInstance(
        services.serverConf.freqDB.database.dbType as FreqDBType,
        services.serverConf.freqDB.database.path,
        services.serverConf.freqDB.database.corpusSize,
        appServices,
        services.serverConf.freqDB.database.options || {}
    );
    // until now there should be no exceptions throw
    importQueryRequest({
        services,
        appServices,
        req,
        queryType,
        lemmatizationLevel,
        uiLang,
        answerMode,
    })
        .pipe(
            concatMap((userConf) =>
                Rx.zippedWith(
                    userConf,
                    mkRuntimeClientConf({
                        conf: services.clientConf,
                        serverConf: services.serverConf,
                        themeId: req.cookies[THEME_COOKIE_NAME] || '',
                        appServices,
                        queryType,
                        lemmatizationLevel,
                    })
                )
            ),
            map(([runtimeConf, userConf]) => {
                userConf.translatLanguage = determineTranslatLang(
                    req,
                    queryType,
                    runtimeConf.layouts
                );
                const lm = new LayoutManager(
                    runtimeConf.layouts,
                    attachNumericTileIdents(runtimeConf.tiles),
                    appServices,
                    queryType
                );
                if (lm.isEmpty()) {
                    const firstAvailQt = List.find(
                        (x) => x.isEnabled,
                        lm.getQueryTypesMenuItems()
                    );
                    runtimeConf.redirect = tuple(
                        303,
                        appServices.createActionUrl(
                            queryTypeToAction(firstAvailQt.type)
                        )
                    );
                }
                return tuple(runtimeConf, userConf, lm);
            }),
            concatMap(([runtimeConf, userConf, layoutManager]) =>
                forkJoin({
                    appServices: rxOf(appServices),
                    dispatcher: rxOf(dispatcher),
                    viewUtils: rxOf(viewUtils),
                    userConf: new Observable<UserConf>((observer) => {
                        observer.next(userConf);
                        observer.complete();
                    }),
                    hostPageEnv: services.toolbar.get(
                        userConf.uiLang,
                        mkPageReturnUrl(req, services.clientConf.rootUrl),
                        req.cookies,
                        viewUtils
                    ),
                    runtimeConf: rxOf(runtimeConf),
                    layoutManager: rxOf(layoutManager),
                    qMatchesEachQuery: rxOf(
                        ...List.map(
                            (query) =>
                                answerMode
                                    ? freqDb.findQueryMatches(
                                          appServices,
                                          query.word,
                                          userConf.lemmatizationLevel,
                                          layoutManager.getLayoutMainPosAttr(),
                                          services.serverConf.freqDB
                                              .minLemmaFreq
                                      )
                                    : rxOf<Array<QueryMatch>>([]),
                            userConf.queries
                        )
                    ).pipe(
                        concatMap((v) => v),
                        reduce(
                            (acc: Array<Array<QueryMatch>>, curr) =>
                                acc.concat([curr]),
                            []
                        )
                    ),
                })
            ),
            // log action
            tap(({ appServices, hostPageEnv, userConf, qMatchesEachQuery }) => {
                logAction({
                    actionWriter: services.actionWriter,
                    req,
                    httpAction,
                    datetime: appServices.getISODatetime(),
                    userId: hostPageEnv.userId,
                    userConf,
                    isMobileClient: clientIsLikelyMobile(req),
                    hasMatch: List.some(
                        (search) =>
                            List.some((item) => !List.empty(item.pos), search),
                        qMatchesEachQuery
                    ),
                }).subscribe();
            })
        )
        .subscribe({
            next: ({
                userConf,
                hostPageEnv,
                runtimeConf,
                qMatchesEachQuery,
                appServices,
                dispatcher,
                viewUtils,
                layoutManager,
            }) => {
                const queryMatchesExtended = List.map(
                    (queryMatches, queryIdx) => {
                        if (queryMatches.length === 0) {
                            return [
                                {
                                    localId: '',
                                    lemma: null,
                                    sublemma: null,
                                    word: userConf.queries[queryIdx].word,
                                    forms: [],
                                    pos: [],
                                    upos: [],
                                    abs: 0,
                                    ipm: 0,
                                    arf: 0,
                                    flevel: null,
                                    isCurrent: true,
                                    initialCap: false,
                                },
                            ];
                        }
                        return determineCurrentMatch(
                            userConf.queries[queryIdx],
                            userConf.lemmatizationLevel,
                            layoutManager.getLayoutMainPosAttr(),
                            List.sorted(
                                (v1, v2) => v2.ipm - v1.ipm,
                                addWildcardMatches([...queryMatches])
                            )
                        );
                    },
                    qMatchesEachQuery
                );
                const { component, tileGroups } = createRootComponent({
                    config: runtimeConf,
                    userSession: userConf,
                    queryMatches: queryMatchesExtended,
                    appServices,
                    dispatcher,
                    onResize: new Observable((_) => undefined),
                    viewUtils,
                    layoutManager,
                });

                const currTheme = new Theme(
                    getAppliedThemeConf(
                        services.clientConf,
                        req.cookies[THEME_COOKIE_NAME]
                    ),
                    runtimeConf.logo
                );

                const { HtmlHead, HtmlBody } = viewInit(viewUtils, currTheme);
                // Here we're going to use the fact that (the current)
                // server-side action dispatcher does not trigger side effects
                // so our models just set 'busy' state and nothing else happens.
                // The execution is synchronous here too.

                dispatcher.dispatch<typeof Actions.RequestQueryResponse>({
                    name: Actions.RequestQueryResponse.name,
                });

                if (runtimeConf.redirect) {
                    res.redirect(
                        runtimeConf.redirect[0],
                        runtimeConf.redirect[1]
                    );
                    return;
                }

                res.send(
                    renderResult({
                        HtmlBody,
                        HtmlHead,
                        services,
                        toolbarData: hostPageEnv,
                        queryMatches: queryMatchesExtended,
                        themes: runtimeConf.colorThemes,
                        currTheme: runtimeConf.colors.themeId,
                        userConfig: userConf,
                        clientConfig: runtimeConf,
                        returnUrl: mkPageReturnUrl(
                            req,
                            services.clientConf.rootUrl
                        ),
                        rootView: component,
                        layout: tileGroups,
                        homepageSections: [...runtimeConf.homepage.tiles],
                        htmlTitle: services.clientConf.htmlTitle
                            ? appServices.importExternalMessage(
                                  services.clientConf.htmlTitle
                              )
                            : undefined,
                        isMobile: false, // TODO should we detect the mode on server too
                        isAnswerMode: answerMode,
                        version: services.version,
                        repositoryUrl: services.repositoryUrl,
                    })
                );
            },
            error: (err: Error) => {
                services.errorLog.error({
                    message: err.message,
                    err,
                });
                const error: [number, string] = [
                    HTTP.Status.InternalServerError,
                    err.message,
                ];
                const userConf = errorUserConf(
                    services.clientConf.applicationId,
                    services.serverConf.languages,
                    error,
                    uiLang
                );
                const clientConfig = emptyClientConf(
                    services.clientConf,
                    req.cookies[THEME_COOKIE_NAME]
                );
                const currTheme = new Theme(
                    getAppliedThemeConf(
                        services.clientConf,
                        req.cookies[THEME_COOKIE_NAME]
                    ),
                    clientConfig.logo
                );
                const { HtmlHead, HtmlBody } = viewInit(
                    viewUtils,
                    currTheme,
                    true
                );
                const theme = new Theme();
                const errView = errPageInit(viewUtils, theme);
                res.send(
                    renderResult({
                        HtmlBody,
                        HtmlHead,
                        services: services,
                        toolbarData: emptyValue(),
                        queryMatches: [],
                        themes: [],
                        currTheme: currTheme.ident,
                        userConfig: userConf,
                        clientConfig,
                        returnUrl: mkPageReturnUrl(
                            req,
                            services.clientConf.rootUrl
                        ),
                        rootView: errView,
                        layout: [],
                        homepageSections: [],
                        htmlTitle: services.clientConf.htmlTitle
                            ? appServices.importExternalMessage(
                                  services.clientConf.htmlTitle
                              )
                            : undefined,
                        isMobile: false, // TODO should we detect the mode on server too
                        isAnswerMode: false,
                        version: services.version,
                        repositoryUrl: services.repositoryUrl,
                        error: error,
                    })
                );
            },
        });
}
