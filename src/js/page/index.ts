/*
 * Copyright 2018 Tomas Machalek <tomas.machalek@gmail.com>
 * Copyright 2018 Institute of the Czech National Corpus,
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
/// <reference path="../translations.d.ts" />
import { ActionDispatcher, ViewUtils } from 'kombo';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { fromEvent, Observable, interval, empty, of as rxOf, merge } from 'rxjs';
import { debounceTime, map, concatMap, take, scan } from 'rxjs/operators';
import { isSubqueryPayload, RecognizedQueries } from '../query/index';
import * as translations from 'translations';

import { IAppServices, AppServices } from '../appServices';
import { encodeArgs, ajax$, encodeURLParameters } from './ajax';
import { ScreenProps } from './hostPage';
import { ClientConf, UserConf, HomepageTileConf } from '../conf';
import { Actions } from '../models/actions';
import { SystemNotifications } from './notifications';
import { GlobalComponents } from '../views/common';
import { createRootComponent } from '../app';
import { initStore } from './cache';
import { TelemetryAction, TileIdentMap } from '../types';
import { HTTPAction } from '../server/routes/actions';
import { MultiDict } from '../multidict';
import { HTTP, Client } from 'cnc-tskit';
import { WdglanceMainProps } from '../views/main';
import { TileGroup } from './layout';

import { GlobalStyle } from '../views/layout/style';


interface MountArgs {
    userSession:UserConf;
    component:React.FC<WdglanceMainProps>;
    layout:Array<TileGroup>;
    appServices:IAppServices;
    mountElement:HTMLElement;
    dispatcher:ActionDispatcher;
    homepage:Array<HomepageTileConf>;
    queryMatches:RecognizedQueries;
}


function mountReactComponent({component, mountElement, layout, dispatcher, appServices, queryMatches, homepage, userSession}:MountArgs) {
    if (!userSession.error || userSession.error[0] === 0) {
        ReactDOM.hydrate(
            React.createElement(
                component,
                {
                    layout: layout,
                    homepageSections: homepage,
                    isMobile: appServices.isMobileMode(),
                    isAnswerMode: userSession.answerMode,
                    error: userSession.error
                }
            ),
            mountElement,
            () => {
                if (userSession.error) {
                    dispatcher.dispatch<typeof Actions.SetEmptyResult>({
                        name: Actions.SetEmptyResult.name,
                        payload: {
                            error: userSession.error
                        }
                    });

                } else if (userSession.answerMode) {
                    if (queryMatches[0].find(v => v.isCurrent)) {
                        dispatcher.dispatch<typeof Actions.RequestQueryResponse>({
                            name: Actions.RequestQueryResponse.name,
                            payload:{
                                focusedTile: window.location.hash.replace('#', '') || undefined
                            }
                        });

                    } else {
                        dispatcher.dispatch<typeof Actions.SetEmptyResult>({
                            name: Actions.SetEmptyResult.name
                        });
                    }
                }
            }
        );
    }
}


function initTelemetry(config:ClientConf, appServices:IAppServices, dispatcher:ActionDispatcher, tileMap:TileIdentMap) {
    // telemetry capture
    if (config.telemetry && Math.random() < config.telemetry.participationProbability) {
        merge(
            new Observable<TelemetryAction>((observer) => {
                dispatcher.registerActionListener((action, _) => {
                    const payload = action.payload || {};
                    observer.next({
                        timestamp: Date.now(),
                        actionName: action.name,
                        isSubquery: isSubqueryPayload(payload) as boolean,
                        isMobile: appServices.isMobileMode(),
                        tileName: (Object.entries(tileMap).find(x => x[1] === payload['tileId']) || [null])[0]
                    });
                });
            }),
            rxOf(1, 1.2, 1.4, 1.6, 1.8, 2.0, 2.3, 2.6, 3, 4.0, 6, 10).pipe(
                concatMap(v => interval(config.telemetry.sendIntervalSecs * v * 1000).pipe(take(1))),
            )
        ).pipe(
            scan<number|TelemetryAction, {toDispatch: Array<TelemetryAction>, buffer:Array<TelemetryAction>}>(
                (acc, curr) => typeof curr === 'number' ?
                    {
                        toDispatch: acc.buffer,
                        buffer: []
                    } :
                    {
                        toDispatch: [],
                        buffer: acc.buffer.concat([curr])
                    },
                    {toDispatch: [], buffer: []}
            ),
            concatMap(
                (data) => data.toDispatch.length > 0 ?
                    ajax$(
                        HTTP.Method.POST,
                        appServices.createActionUrl(HTTPAction.TELEMETRY),
                        {telemetry: data.toDispatch},
                        {contentType: 'application/json'}
                    ) :
                    empty()
            )
        ).subscribe();
    }
}


export function initClient(mountElement:HTMLElement, config:ClientConf, userSession:UserConf, queryMatches:RecognizedQueries) {
    const dispatcher = new ActionDispatcher();
    const notifications = new SystemNotifications(dispatcher);
    const uiLangSel = userSession.uiLang || 'en-US';
    const viewUtils = new ViewUtils<GlobalComponents>({
        uiLang: uiLangSel,
        translations: translations,
        staticUrlCreator: (path) => config.rootUrl + 'assets/' + path,
        actionUrlCreator: (path, args) => {
                const argsStr = Array.isArray(args) || MultiDict.isMultiDict(args) ?
                        encodeURLParameters(args) : encodeArgs(args);
                return config.hostUrl + (path.substr(0, 1) === '/' ? path.substr(1) : path ) +
                        (argsStr.length > 0 ? '?' + argsStr : '');
        }

    });
    const appServices = new AppServices({
        notifications: notifications,
        uiLang: userSession.uiLang,
        domainNames: config.searchDomains.map(v => [v.code, v.label]),
        translator: viewUtils,
        staticUrlCreator: viewUtils.createStaticUrl,
        actionUrlCreator: viewUtils.createActionUrl,
        dataReadability: config.dataReadability || {metadataMapping: {}, commonStructures: {}},
        apiHeadersMapping: config.apiHeaders,
        mobileModeTest: () => Client.isMobileTouchDevice()
    });

    //appServices.forceMobileMode(); // DEBUG

    (config.onLoadInit || []).forEach(initFn => {
        if (initFn in window) {
            try {
                window[initFn].init();

            } catch (err) {
                console.error(err);
            }
        }
    })

    const windowResize$:Observable<ScreenProps> = fromEvent(window, 'resize')
    .pipe(
        debounceTime(500),
        map(v => ({
            isMobile: appServices.isMobileMode(),
            innerWidth: window.innerWidth,
            innerHeight: window.innerHeight
        }))
    );

    try {
        const [WdglanceMain, layout, tileMap] = createRootComponent({
            config,
            userSession,
            queryMatches,
            appServices,
            dispatcher,
            onResize: windowResize$,
            viewUtils,
            cache: initStore('requests', config.reqCacheTTL)
        });
        console.info('tile map: ', tileMap); // DEBUG TODO

        initTelemetry(config, appServices, dispatcher, tileMap);
        mountReactComponent({
            userSession,
            component: WdglanceMain,
            mountElement,
            layout,
            dispatcher,
            appServices,
            queryMatches,
            homepage: [...config.homepage.tiles]
        });

    } catch (e) {
        // No need to do anything more as being
        // here means the configuration is broken.
        console.error(e);
    }
}