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
import { QueryType, QueryMatch, matchesPos, addWildcardMatches, queryTypeToAction } from '../../query/index.js';
import { QueryValidator } from '../../query/validation.js';
import {
    UserConf, ClientStaticConf, ClientConf, emptyClientConf, errorUserConf, isTileDBConf,
    THEME_COOKIE_NAME, getThemeList, getAppliedThemeConf, UserQuery, ServerConf,
    mergeToEmptyLayoutConf, MainPosAttrValues, LAST_USED_TRANSLAT_LANG_COOKIE_NAME,
    LayoutsConfig,
    HomepageTileConf,
    GroupLayoutConfig
} from '../../conf/index.js';
import { init as viewInit } from '../../views/layout/layout.js';
import { init as errPageInit } from '../../views/error.js';
import { ServerSideActionDispatcher } from '../core.js';
import { emptyValue } from '../toolbar/empty.js';
import { Services  } from '../actionServices.js';
import { loadFile } from '../files.js';
import { createRootComponent } from '../../app.js';
import { fetchReqArgArray, createHelperServices, mkPageReturnUrl, renderResult, fetchUrlParamArray,
    clientIsLikelyMobile } from './common.js';
import { maxQueryWordsForQueryType } from '../../conf/validation.js';
import { Actions } from '../../models/actions.js';
import { HTTPAction } from '../../page/actions.js';
import { logAction } from '../actionLog/common.js';
import { LayoutManager } from '../../page/layout.js';
import { attachNumericTileIdents } from '../../page/index.js';
import { createInstance, FreqDBType } from '../freqdb/factory.js';
import urlJoin from 'url-join';
import { TileConf } from '../../page/tile.js';
import { layoutConf, queriesConf, generatePreviewTileConf } from '../../conf/preview.js';


interface MkRuntimeClientConfArgs {
    conf:ClientStaticConf;
    serverConf:ServerConf;
    themeId:string;
    appServices:IAppServices;
    queryType:QueryType;
}

export function createParentWagLink(
    baseUrl:string,
    queryType:QueryType,
    queries:Array<UserQuery>,
    answerMode:boolean
):string|undefined {
    if (!baseUrl) {
        return undefined;
    }
    const action = queryTypeToAction(queryType) || '';
    if (answerMode) {
        return urlJoin(
            baseUrl,
            action,
            List.map(
                v => v.word,
                queries
            ).join('--')
        );

    } else {
        return urlJoin(baseUrl, action);
    }
}



/**
 * Out of all the configured tiles for all the query types, filter out everything
 * except for the provided query type.
 */
function filterTilesByQueryType(
    layouts:LayoutsConfig,
    tiles:{[ident:string]:TileConf},
    qType:QueryType
):{[tileId:string]:TileConf} {
    return pipe(
        Object.entries(layouts),
        List.filter(([qt, ]) => qt === qType || qType === QueryType.PREVIEW),
        List.flatMap(([, layout]) => layout.groups as Array<GroupLayoutConfig>),
        List.flatMap(x => typeof x !== 'string' ? x.tiles : []),
        List.map(x => tuple(x.tile, tiles[x.tile])),
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
    queryType
}:MkRuntimeClientConfArgs):Observable<ClientConf> {

    const layouts = mergeToEmptyLayoutConf(typeof conf.layouts !== 'string' ? conf.layouts : {});
    const tiles = filterTilesByQueryType(
        layouts,
        typeof conf.tiles !== 'string' && !isTileDBConf(conf.tiles) ? conf.tiles : {},
        queryType

    );

    return forkJoin([
        forkJoin(
            List.map(
                item => appServices.importExternalText(
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
        ).pipe(
            defaultIfEmpty<Array<HomepageTileConf>, Array<HomepageTileConf>>([])
        ),
        conf.homepage.footer ?
            appServices.importExternalText(conf.homepage.footer, loadFile) : rxOf(undefined)
    ]).pipe(
        map(([hpTiles, footer]) => {
            return {
                rootUrl: conf.rootUrl,
                hostUrl: conf.hostUrl,
                runtimeAssetsUrl: conf.runtimeAssetsUrl,
                parentWagUrl: conf.parentWagUrl,
                favicon: conf.favicon,
                logo: {
                    url: appServices.importExternalMessage(conf.logo?.url),
                    inlineStyle: conf.logo.inlineStyle || {},
                    label: appServices.importExternalMessage(conf.logo?.label),
                    subWag: conf.logo?.subWag ?
                        {
                            url: appServices.importExternalMessage(conf.logo.subWag.url),
                            inlineStyle: conf.logo.subWag.inlineStyle || {},
                            label: appServices.importExternalMessage(conf.logo.subWag.label)
                        } :
                        undefined
                },
                corpInfoApiUrl: conf.corpInfoApiUrl,
                apiHeaders: conf.apiHeaders,
                onLoadInit: conf.onLoadInit,
                dataReadability: typeof conf.dataReadability === 'string' ?
                    {metadataMapping: {}, commonStructures: {}} :
                    conf.dataReadability,
                colors: getAppliedThemeConf(conf, themeId),
                colorThemes: List.map(
                    v => ({
                        themeId: v.themeId,
                        themeLabel: appServices.importExternalMessage(v.themeLabel),
                        description: v.description ? appServices.importExternalMessage(v.description) : ''
                    }),
                    getThemeList(conf)
                ),
                dataStreamingUrl: conf.dataStreamingUrl,
                tiles,
                layouts: mergeToEmptyLayoutConf(typeof conf.layouts !== 'string' ? conf.layouts : {}),
                queryTypes: typeof conf.layouts !== 'string' ?
                    pipe(
                        [
                            tuple(conf.layouts.cmp, QueryType.CMP_QUERY),
                            tuple(conf.layouts.single, QueryType.SINGLE_QUERY),
                            tuple(conf.layouts.translat, QueryType.TRANSLAT_QUERY)
                        ],
                        List.filter(([tst,]) => !!tst),
                        List.map(([,v]) => v)
                    ) : [QueryType.SINGLE_QUERY],
                externalStyles: conf.externalStyles || [],
                issueReportingUrl: conf.issueReportingUrl,
                homepage: {
                    tiles: hpTiles,
                    footer
                },
                maxTileErrors: conf.maxTileErrors,
                maxQueryWords: serverConf.freqDB.maxQueryWords
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

function determineTranslatLang(req:Request, layoutsConf:LayoutsConfig) {
    if (req.params['lang']) {
        return req.params['lang'];
    }
    if (req.cookies[LAST_USED_TRANSLAT_LANG_COOKIE_NAME]) {
        return req.cookies[LAST_USED_TRANSLAT_LANG_COOKIE_NAME];
    }
    if (Array.isArray(layoutsConf.translat.targetLanguages) &&
            layoutsConf.translat.targetLanguages.length > 0) {
        return layoutsConf.translat.targetLanguages[0].code;
    }
    return undefined;
}

export function importQueryRequest({
    services,
    appServices,
    req,
    queryType,
    uiLang,
    answerMode
}:ImportQueryReqArgs):Observable<UserConf> {
    const validator = new QueryValidator(appServices);
    return new Observable<UserConf>(observer => {
        try {
            const queries = answerMode ?
                fetchUrlParamArray(req, 'query', queryType === QueryType.CMP_QUERY ? 2 : 1) :
                pipe(
                    Array.isArray(req.query.q) ? req.query.q : [req.query.q],
                    List.map(
                        v => {
                            if (typeof v === 'string') {
                                return v;
                            }
                            return '';
                        }
                    ),
                    items => queryType === QueryType.CMP_QUERY ?
                        List.concat(List.repeat(_ => '', 2 - items.length), items) :
                        items
                );
            const layouts = services.clientConf.layouts;
            if (queryType !== QueryType.PREVIEW && answerMode && typeof layouts !== 'string') { // the type check is always true here (bad type design...)
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
            const userConfNorm:UserConf = {
                applicationId: services.clientConf.applicationId,
                uiLang,
                uiLanguages: services.serverConf.languages,
                translatLanguage: determineTranslatLang(
                    req,
                    typeof layouts === 'string' ? {} : layouts
                ),
                queryType,
                queries: queryType === QueryType.PREVIEW ?
                    queriesConf :
                    compileQueries(
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


/**
 * note: functions expects availMatches sorted from highest ipm to lowest
 */
export function markMatch(userQuery:UserQuery, posAttr:MainPosAttrValues, availMatches:Array<QueryMatch>):Array<QueryMatch> {
    if (List.size(availMatches) === 0) {
        return availMatches;
    }
    if (userQuery.lemma && !List.empty(userQuery.pos)) {
        const srch = List.findIndex(
            x => matchesPos(x, posAttr, userQuery.pos) && userQuery.lemma === x.lemma,
            availMatches
        );
        if (srch > -1) {
            availMatches[srch].isCurrent = true;
            return availMatches;
        }
    }
    if (userQuery.lemma) {
        const srch = List.findIndex(
            x => userQuery.lemma === x.lemma,
            availMatches
        );
        if (srch > -1) {
            availMatches[srch].isCurrent = true;
            return availMatches;
        }
    }
    availMatches[0].isCurrent = true;
    return availMatches;
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
    if (queryType === QueryType.PREVIEW) {
        services.clientConf.tiles = generatePreviewTileConf();
        services.clientConf.layouts = layoutConf;
    }

    const dispatcher = new ServerSideActionDispatcher();
    const [viewUtils, appServices] = createHelperServices(services, uiLang, queryType);
    const freqDb = createInstance(
        services.serverConf.freqDB.database.dbType as FreqDBType,
        services.serverConf.freqDB.database.path,
        services.serverConf.freqDB.database.corpusSize,
        appServices,
        services.serverConf.freqDB.database.options || {}
    );
    // until now there should be no exceptions throw
    importQueryRequest({
        services, appServices, req, queryType, uiLang, answerMode
    }).pipe(
        concatMap(
            userConf => Rx.zippedWith(
                userConf,
                mkRuntimeClientConf({
                    conf: services.clientConf,
                    serverConf: services.serverConf,
                    themeId: req.cookies[THEME_COOKIE_NAME] || '',
                    appServices,
                    queryType
                })
            )
        ),
        map(
            ([runtimeConf, userConf]) => {
                const lm = new LayoutManager(
                    runtimeConf.layouts,
                    attachNumericTileIdents(runtimeConf.tiles),
                    appServices,
                    queryType
                );
                if (lm.isEmpty()) {
                    const firstAvailQt = List.find(x => x.isEnabled, lm.getQueryTypesMenuItems());
                    runtimeConf.redirect = tuple(
                        303, appServices.createActionUrl(queryTypeToAction(firstAvailQt.type))
                    )
                }
                return tuple(
                    runtimeConf,
                    userConf,
                    lm
                );
            }
        ),
        concatMap(
            ([runtimeConf, userConf, layoutManager]) => forkJoin({
            appServices: rxOf(appServices),
            dispatcher: rxOf(dispatcher),
            viewUtils: rxOf(viewUtils),
            userConf: new Observable<UserConf>(
                (observer) => {
                    observer.next(userConf);
                    observer.complete();
                }
            ),
            hostPageEnv: services.toolbar.get(userConf.uiLang, mkPageReturnUrl(req, services.clientConf.rootUrl), req.cookies, viewUtils),
            runtimeConf: rxOf(runtimeConf),
            layoutManager: rxOf(layoutManager),
            qMatchesEachQuery: rxOf(...List.map(
                    query => answerMode ?
                        freqDb.findQueryMatches(
                            appServices,
                            query.word,
                            layoutManager.getLayoutMainPosAttr(),
                            services.serverConf.freqDB.minLemmaFreq,
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
        tap(({appServices, hostPageEnv, userConf, qMatchesEachQuery}) => {
            logAction({
                actionWriter: services.actionWriter,
                req,
                httpAction,
                datetime: appServices.getISODatetime(),
                userId: hostPageEnv.userId,
                userConf,
                isMobileClient: clientIsLikelyMobile(req),
                hasMatch: List.some(
                    search => List.some(item => !List.empty(item.pos), search),
                    qMatchesEachQuery
                )
            }).subscribe();
        })
    ).subscribe({
        next: ({
            userConf,
            hostPageEnv,
            runtimeConf,
            qMatchesEachQuery,
            appServices,
            dispatcher,
            viewUtils,
            layoutManager
        }) => {
            const queryMatchesExtended = List.map(
                (queryMatches, queryIdx) => {
                    if (queryMatches.length === 0) {
                        return [{
                            lemma: null,
                            word: userConf.queries[queryIdx].word,
                            pos: [],
                            upos: [],
                            abs: 0,
                            ipm: 0,
                            arf: 0,
                            flevel: null,
                            isCurrent: true
                        }];
                    }
                    return markMatch(
                        userConf.queries[queryIdx],
                        layoutManager.getLayoutMainPosAttr(),
                        List.sorted(
                            (v1, v2) => v2.ipm - v1.ipm,
                            addWildcardMatches([...queryMatches])
                        )
                    );
                },
                qMatchesEachQuery
            );

            const parentWagUrl = createParentWagLink(
                runtimeConf.parentWagUrl,
                queryType,
                userConf.queries,
                answerMode
            );

            const {component, tileGroups,} = createRootComponent({
                config: runtimeConf,
                userSession: userConf,
                queryMatches: queryMatchesExtended,
                appServices,
                dispatcher,
                onResize: new Observable((_) => undefined),
                viewUtils,
                layoutManager
            });

            const {HtmlHead, HtmlBody} = viewInit(viewUtils);
            // Here we're going to use the fact that (the current)
            // server-side action dispatcher does not trigger side effects
            // so our models just set 'busy' state and nothing else happens.
            // The execution is synchronous here too.

            dispatcher.dispatch<typeof Actions.RequestQueryResponse>({
                name: Actions.RequestQueryResponse.name
            });

            if (runtimeConf.redirect) {
                res.redirect(runtimeConf.redirect[0], runtimeConf.redirect[1]);
                return;
            }

            res.send(renderResult({
                HtmlBody,
                HtmlHead,
                services,
                toolbarData: hostPageEnv,
                queryMatches: queryMatchesExtended,
                themes: runtimeConf.colorThemes,
                currTheme: runtimeConf.colors.themeId,
                userConfig: userConf,
                currentParentWagPageUrl: parentWagUrl,
                clientConfig: runtimeConf,
                returnUrl: mkPageReturnUrl(req, services.clientConf.rootUrl),
                rootView: component,
                layout: tileGroups,
                homepageSections: [...runtimeConf.homepage.tiles],
                htmlTitle: services.clientConf.htmlTitle ? appServices.importExternalMessage(services.clientConf.htmlTitle) : undefined,
                isMobile: false, // TODO should we detect the mode on server too
                isAnswerMode: answerMode,
                version: services.version,
                repositoryUrl: services.repositoryUrl
            }));
        },
        error: (err:Error) => {
            services.errorLog.error({
                message: err.message,
                err
            });
            const error:[number, string] = [HTTP.Status.BadRequest, err.message];
            const userConf = errorUserConf(
                services.clientConf.applicationId, services.serverConf.languages, error, uiLang);
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
                currentParentWagPageUrl: undefined,
                clientConfig: emptyClientConf(services.clientConf, req.cookies[THEME_COOKIE_NAME]),
                returnUrl: mkPageReturnUrl(req, services.clientConf.rootUrl),
                rootView: errView,
                layout: [],
                homepageSections: [],
                htmlTitle: services.clientConf.htmlTitle ? appServices.importExternalMessage(services.clientConf.htmlTitle) : undefined,
                isMobile: false, // TODO should we detect the mode on server too
                isAnswerMode: false,
                version: services.version,
                repositoryUrl: services.repositoryUrl,
                error: error
            }));
        }
    });
}