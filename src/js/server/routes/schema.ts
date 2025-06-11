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
import { EMPTY, Observable, forkJoin, of as rxOf } from 'rxjs';
import { concatMap, map, reduce } from 'rxjs/operators';
import { HTTP, List, Rx, tuple } from 'cnc-tskit';

import { AppServices } from '../../appServices.js';
import { QueryMatch, addWildcardMatches, queryTypeToAction } from '../../query/index.js';
import {
    UserConf, emptyClientConf, errorUserConf,
    THEME_COOKIE_NAME, getAppliedThemeConf,
} from '../../conf/index.js';
import { init as viewInit } from '../../views/layout/layout.js';
import { init as errPageInit } from '../../views/error.js';
import { ServerSideActionDispatcher } from '../core.js';
import { emptyValue } from '../toolbar/empty.js';
import { createRootComponent } from '../../app.js';
import { mkPageReturnUrl, renderResult } from './common.js';
import { Actions } from '../../models/actions.js';
import { LayoutManager } from '../../page/layout.js';
import { attachNumericTileIdents } from '../../page/index.js';
import { encodeArgs } from '../../page/ajax.js';
import { ViewUtils } from 'kombo';
import { GlobalComponents } from '../../views/common/index.js';
import { createParentWagLink, markMatch, mkRuntimeClientConf, QueryActionArgs } from './main.js';
import { DataStreamingMock } from '../../page/streaming.js';
import { layoutConf, responseDataConf, tileConf } from '../../conf/static.js';

export function schemaPage({
    services,
    answerMode,
    httpAction,
    queryType,
    uiLang,
    req,
    res,
    next
}:QueryActionArgs) {
    services.clientConf.tiles = tileConf;
    services.clientConf.layouts = layoutConf;

    const dispatcher = new ServerSideActionDispatcher();
    const viewUtils = new ViewUtils<GlobalComponents>({
        uiLang: uiLang,
        translations: services.translations,
        staticUrlCreator: (path) => services.clientConf.runtimeAssetsUrl + path,
        actionUrlCreator: (path, args) => services.clientConf.hostUrl +
                (path.substr(0, 1) === '/' ? path.substr(1) : path ) +
                (Object.keys(args || {}).length > 0 ? '?' + encodeArgs(args) : '')
    });
    const appServices = new AppServices({
        notifications: null, // TODO
        uiLang: uiLang,
        translator: viewUtils,
        staticUrlCreator: viewUtils.createStaticUrl,
        actionUrlCreator: viewUtils.createActionUrl,
        dataReadability: {metadataMapping: {}, commonStructures: {}},
        dataStreaming: new DataStreamingMock(responseDataConf),
        apiHeadersMapping: services.clientConf.apiHeaders || {},
        mobileModeTest: ()=>false,
        apiCaller: {
            callAPI: (api, streaming, tileId, queryIdx, queryArgs) => EMPTY,
            callAPIWithExtraVal: (api, streaming, tileId, queryIdx, queryArgs, passThrough) => EMPTY
        },
    });

    // until now there should be no exceptions throw
    rxOf({
        applicationId: services.clientConf.applicationId,
        uiLang,
        uiLanguages: services.serverConf.languages,
        translatLanguage: undefined,
        queryType,
        queries: [{word: 'hlava', lemma: 'hlava', pos: ['N']}],
        answerMode,
        staticPage: true,
    } as UserConf).pipe(
        concatMap(
            userConf => Rx.zippedWith(
                userConf,
                mkRuntimeClientConf({
                    conf: services.clientConf,
                    serverConf: services.serverConf,
                    themeId: req.cookies[THEME_COOKIE_NAME] || '',
                    appServices,
                    queryType,
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
                    query => ([[{
                        word: query.word,
                        lemma: query.lemma,
                        pos: List.map(v => ({value: v, label: v}), query.pos),
                        ipm: 2.1,
                        abs: 500,
                        flevel: 2,
                        isCurrent: true,
                    }]] as Array<Array<QueryMatch>>),
                    userConf.queries

                )).pipe(
                    concatMap(v => v),
                    reduce((acc:Array<Array<QueryMatch>>, curr) => acc.concat([curr]), [])
                )
            })
        ),
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
