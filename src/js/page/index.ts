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

// Fix webpack public path for dynamic imports when distFilesUrl is not configured
declare var __webpack_public_path__: string;
if (typeof __webpack_public_path__ !== 'undefined' && __webpack_public_path__ === '/') {
    __webpack_public_path__ = '/dist/';
}

import { ActionDispatcher, ViewUtils } from 'kombo';
import * as React from 'react';
import { hydrateRoot } from 'react-dom/client';
import { fromEvent, Observable } from 'rxjs';
import { debounceTime, map } from 'rxjs/operators';
import { QueryType, RecognizedQueries } from '../query/index.js';
import translations from 'translations';

import { IAppServices, AppServices } from '../appServices.js';
import { encodeArgs, encodeURLParameters } from './ajax.js';
import { ScreenProps } from './hostPage.js';
import { ClientConf, UserConf, HomepageTileConf } from '../conf/index.js';
import { Actions } from '../models/actions.js';
import { SystemNotifications } from './notifications.js';
import { GlobalComponents } from '../views/common/index.js';
import { createRootComponent } from '../app.js';
import { MultiDict } from '../multidict.js';
import { Client, List, pipe, Dict } from 'cnc-tskit';
import { WdglanceMainProps } from '../views/main.js';
import { LayoutManager, TileGroup } from './layout.js';
import { TileConf } from './tile.js';
import { DataStreaming, IDataStreaming, DataStreamingPreview } from './streaming.js';
import { callWithExtraVal } from '../api/util.js';
import { DataApi } from '../types.js';


interface MountArgs {
    userSession:UserConf;
    component:React.FC<WdglanceMainProps>;
    layout:Array<TileGroup>;
    appServices:IAppServices;
    mountElement:HTMLElement;
    dispatcher:ActionDispatcher;
    homepage:Array<HomepageTileConf>;
    queryMatches:RecognizedQueries;
    parentWagUrl:string|undefined;
}


const DATA_STREAMING_CLIENTS_READY_TIMEOUT_SECS = 10;


function mountReactComponent({
    component,
    mountElement,
    layout,
    dispatcher,
    appServices,
    queryMatches,
    parentWagUrl,
    homepage,
    userSession
}:MountArgs) {
    if (!userSession.error || userSession.error[0] === 0) {
        const onMount = () => {
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
        };

        const rootComp = React.createElement(
            component,
            {
                layout,
                homepageSections: homepage,
                isMobile: appServices.isMobileMode(),
                isAnswerMode: userSession.answerMode,
                error: userSession.error,
                queries: userSession.queries,
                parentWagUrl,
                onMount
            }
        );

        const root = hydrateRoot(
            mountElement,
            rootComp
        );
        root.render(rootComp);
    }
}


export const attachNumericTileIdents = (config:{[ident:string]:TileConf}):{[ident:string]:number} => {
    const ans = {};
    Object.keys(config).forEach((k, i) => {
        ans[k] = i;
    });
    return ans;
};



export function initClient(
    mountElement:HTMLElement,
    config:ClientConf,
    userSession:UserConf,
    queryMatches:RecognizedQueries
) {
    const dispatcher = new ActionDispatcher();
    const notifications = new SystemNotifications(dispatcher);
    const uiLangSel = userSession.uiLang || 'en-US';
    const viewUtils = new ViewUtils<GlobalComponents>({
        uiLang: uiLangSel,
        translations: translations,
        staticUrlCreator: (path) => config.runtimeAssetsUrl + path,
        actionUrlCreator: (path, args) => {
                const argsStr = Array.isArray(args) || MultiDict.isMultiDict(args) ?
                        encodeURLParameters(args) : encodeArgs(args);
                return config.hostUrl + (path.substring(0, 1) === '/' ? path.substring(1) : path ) +
                        (argsStr.length > 0 ? '?' + argsStr : '');
        }
    });
    const tileIdentMap = attachNumericTileIdents(config.tiles);
    const dataStreaming = userSession.queryType === QueryType.PREVIEW ?
        new DataStreamingPreview() :
        new DataStreaming(
            null,
            pipe(
                config.tiles,
                Dict.filter(
                    (v, k) => v.useDataStream
                ),
                Dict.keys(),
                List.map(v => tileIdentMap[v])
            ),
            config.dataStreamingUrl,
            DATA_STREAMING_CLIENTS_READY_TIMEOUT_SECS * 1000,
            userSession
        );
    const appServices = new AppServices({
        notifications,
        uiLang: userSession.uiLang,
        translator: viewUtils,
        staticUrlCreator: viewUtils.createStaticUrl,
        actionUrlCreator: viewUtils.createActionUrl,
        dataReadability: config.dataReadability || {metadataMapping: {}, commonStructures: {}},
        apiHeadersMapping: config.apiHeaders,
        apiCaller: {
            callAPI: (api, streaming, tileId, queryIdx, queryArgs) => api.call(streaming, tileId, queryIdx, queryArgs),
            callAPIWithExtraVal: <T, U, V>(
                api:DataApi<T, U>,
                streaming:IDataStreaming,
                tileId:number,
                queryIdx:number,
                args:T,
                passThrough:V
            ) => callWithExtraVal(streaming, api, tileId, queryIdx, args, passThrough)
        },
        dataStreaming,
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
        const layoutManager = new LayoutManager(
            config.layouts,
            tileIdentMap,
            appServices,
            userSession.queryType
        );
        const {component, tileGroups} = createRootComponent({
            config,
            userSession,
            queryMatches,
            appServices,
            dispatcher,
            onResize: windowResize$,
            viewUtils,
            layoutManager
        });
        console.info('tile map: ', tileIdentMap); // DEBUG TODO

        mountReactComponent({
            userSession,
            component,
            mountElement,
            layout: tileGroups,
            dispatcher,
            appServices,
            queryMatches,
            parentWagUrl: config.parentWagUrl,
            homepage: [...config.homepage.tiles]
        });

    } catch (e) {
        // No need to do anything more as being
        // here means the configuration is broken.
        console.error(e);
    }
}