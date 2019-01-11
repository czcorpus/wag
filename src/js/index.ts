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
import { ActionDispatcher, ViewUtils } from 'kombo';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import {init as viewInit} from './views/main';
import { WdglanceMainFormModel } from './models/main';
import {init as concInit, ConcordanceBoxInitArgs, ConcordanceBoxConf} from './tiles/concordance/index';
import {init as freqInit} from './tiles/ttDistrib/index';
import { GlobalComponents, init as globalCompInit } from './views/global';
import * as translations from 'translations';
import { AppServices } from './appServices';
import { SystemNotifications } from './notifications';
import { ActionNames } from './models/actions';

declare var require:(src:string)=>void;  // webpack
require('../css/index.less');
require('../css/components/global.less');
require('../css/components/main.less');


export interface WdglanceConf {
    mountElement:HTMLElement;
    uiLang:string;
    rootUrl:string;
    tilesConf:{[ident:string]:any};
}

export const init = ({mountElement, uiLang, rootUrl, tilesConf}:WdglanceConf) => {
    const dispatcher = new ActionDispatcher();
    const viewUtils = new ViewUtils<GlobalComponents>({
        uiLang: uiLang || 'en_US',
        translations: translations,
        staticUrlCreator: (path) => rootUrl + 'assets/' + path
    });

    const notifications = new SystemNotifications(dispatcher);
    const appServices = new AppServices(notifications, viewUtils);

    const globalComponents = globalCompInit(dispatcher, viewUtils);
    viewUtils.attachComponents(globalComponents);
    const model = new WdglanceMainFormModel(
        dispatcher,
        appServices,
        [
            ['cs_CZ', 'čeština'],
            ['en_US', 'English']
        ]
    );
    dispatcher.captureAction(
        ActionNames.RequestQueryResponse,
        (action) => model.getState().isValid
    );

    const component = viewInit(dispatcher, viewUtils, model);

    // window conc.
    const concTile = concInit({
        dispatcher: dispatcher,
        appServices: appServices,
        ut: viewUtils,
        mainForm: model,
        conf: tilesConf['concordance'] as ConcordanceBoxConf
    });

    // window freq.
    const freqTile = freqInit(0, dispatcher, viewUtils, model);


    ReactDOM.render(
        React.createElement(
            component.WdglanceMain,
            {
                window0: freqTile.getView(),
                window0Label: freqTile.getLabel(),
                window1: null,
                window1Label: 'Collocations',
                window2: null,
                window2Label: 'Treq',
                window3: concTile.getView(),
                window3Label: concTile.getLabel(),
            }
        ),
        mountElement
    );
};