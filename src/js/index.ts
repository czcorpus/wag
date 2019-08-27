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
/// <reference path="./translations.d.ts" />
import * as Immutable from 'immutable';
import { ActionDispatcher, ViewUtils } from 'kombo';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { fromEvent, Observable } from 'rxjs';
import { debounceTime, map } from 'rxjs/operators';
import * as translations from 'translations';

import { AppServices } from './appServices';
import { encodeArgs } from './common/ajax';
import { ScreenProps } from './common/hostPage';
import { LemmaVariant } from './common/query';
import { ClientConf, UserConf } from './conf';
import { ActionName } from './models/actions';
import { SystemNotifications } from './notifications';
import { GlobalComponents } from './views/global';
import { createRootComponent } from './app';
import { initStore } from './cacheDb';

declare var DocumentTouch;
declare var require:(src:string)=>void;  // webpack
require('../css/index.less');
require('../css/components/global.less');
require('../css/components/main.less');
require('../css/mobile-medium.less');
require('../css/mobile-small.less');
require('theme.less');


export const initClient = (mountElement:HTMLElement, config:ClientConf, userSession:UserConf, lemmas:Array<LemmaVariant>) => {
    const dispatcher = new ActionDispatcher();
    const notifications = new SystemNotifications(dispatcher);
    const uiLangSel = userSession.uiLang || 'en-US';
    const viewUtils = new ViewUtils<GlobalComponents>({
        uiLang: uiLangSel,
        translations: translations,
        staticUrlCreator: (path) => config.rootUrl + 'assets/' + path,
        actionUrlCreator: (path, args) => config.hostUrl +
                (path.substr(0, 1) === '/' ? path.substr(1) : path ) +
                (Object.keys(args || {}).length > 0 ? '?' + encodeArgs(args) : '')
    });
    const appServices = new AppServices({
        notifications: notifications,
        uiLang: userSession.uiLang,
        searchLanguages: config.searchLanguages.map(v => [v.code, v.label]),
        translator: viewUtils,
        staticUrlCreator: viewUtils.createStaticUrl,
        actionUrlCreator: viewUtils.createActionUrl,
        dbValuesMapping: config.dbValuesMapping || {},
        apiHeadersMapping: config.apiHeaders,
        mobileModeTest: () => window.matchMedia('screen and (max-width: 480px)').matches
                && (('ontouchstart' in window) || window['DocumentTouch'] && document instanceof DocumentTouch)
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

    const [WdglanceMain, currLayout] = createRootComponent({
        config: config,
        userSession: userSession,
        lemmas: lemmas,
        appServices: appServices,
        dispatcher: dispatcher,
        onResize: windowResize$,
        viewUtils: viewUtils,
        cache: initStore('requests', config.reqCacheTTL)
    });

    ReactDOM.hydrate(
        React.createElement(
            WdglanceMain,
            {
                layout: currLayout,
                homepageSections: Immutable.List<{label:string, html:string}>(config.homepage.tiles),
                isMobile: appServices.isMobileMode(),
                isAnswerMode: userSession.answerMode
            }
        ),
        mountElement,
        () => {
            if (userSession.error) {
                dispatcher.dispatch({
                    name: ActionName.SetEmptyResult,
                    payload: {
                        error: userSession.error
                    }
                });

            } else if (userSession.answerMode) {
                if (lemmas.find(v => v.isCurrent)) {
                    dispatcher.dispatch({
                        name: ActionName.RequestQueryResponse
                    });

                } else {
                    dispatcher.dispatch({
                        name: ActionName.SetEmptyResult
                    });
                }
            }
        }
    );
}