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
import {init as viewInit} from './views/main';
import { WdglanceMainFormModel } from './models/query';
import {init as concInit, ConcordanceTileConf} from './tiles/concordance/index';
import {init as freqInit, TTDistTileConf} from './tiles/ttDistrib/index';
import {init as timeDistInit, TimeDistTileConf} from './tiles/timeDistrib/index';
import {init as collocInit, CollocationsTileConf} from './tiles/collocations/index';
import {init as treqInit, TreqTileConf} from './tiles/treq/index';
import { GlobalComponents, init as globalCompInit } from './views/global';
import * as translations from 'translations';
import { AppServices } from './appServices';
import { SystemNotifications } from './notifications';
import { ActionNames } from './models/actions';
import { TileFrameProps, ITileProvider } from './abstract/types';
import { WdglanceTilesModel } from './models/tiles';

declare var require:(src:string)=>void;  // webpack
require('../css/index.less');
require('../css/components/global.less');
require('../css/components/main.less');
require('../css/mobile.less');


export interface WdglanceConf {
    mountElement:HTMLElement;
    uiLang:string;
    rootUrl:string;
    tilesConf:{[ident:string]:any};
}

const attachTile = (data:Array<TileFrameProps>, tile:ITileProvider):void => {
    tile.init();
    data.push({
        tileId: tile.getIdent(),
        Component: tile.getView(),
        label: tile.getLabel(),
        supportsExtendedView: tile.supportsExtendedView()
    });
};


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
    const formModel = new WdglanceMainFormModel(
        dispatcher,
        appServices,
        [
            ['cs_CZ', 'čeština'],
            ['en_US', 'English']
        ]
    );
    const tilesModel = new WdglanceTilesModel(
        dispatcher,
        appServices
    );
    dispatcher.captureAction(
        ActionNames.RequestQueryResponse,
        (action) => formModel.getState().isValid
    );

    const component = viewInit(dispatcher, viewUtils, formModel, tilesModel);

    const tiles:Array<TileFrameProps> = [];

    // window conc. -------------------------------------------------
    const concTile = concInit({
        tileId: 0,
        dispatcher: dispatcher,
        ut: viewUtils,
        mainForm: formModel,
        tilesModel: tilesModel,
        appServices: appServices,
        conf: tilesConf['ConcordanceTileConf'] as ConcordanceTileConf
    });
    attachTile(tiles, concTile);

    // window freq. --------------------------------------------------
    const freqTile = freqInit({
        tileId: 1,
        dispatcher: dispatcher,
        ut: viewUtils,
        mainForm: formModel,
        tilesModel: tilesModel,
        appServices: appServices,
        conf: tilesConf['TTDistTileConf'] as TTDistTileConf
    });
    attachTile(tiles, freqTile);

    // window colloc. --------------------------------------------------

    const collocTile = collocInit({
        tileId: 2,
        dispatcher: dispatcher,
        ut: viewUtils,
        mainForm: formModel,
        tilesModel: tilesModel,
        appServices: appServices,
        conf: tilesConf['CollocationsTileConf'] as CollocationsTileConf
    });
    attachTile(tiles, collocTile);

    // window time distrib. -------------------------------------------------

    attachTile(tiles, timeDistInit({
        tileId: 3,
        dispatcher: dispatcher,
        ut: viewUtils,
        mainForm: formModel,
        tilesModel: tilesModel,
        appServices: appServices,
        conf: tilesConf['TimeDistTileConf'] as TimeDistTileConf
    }));

    // window treq. --------------------------------------------------

    const treqTile = treqInit({
        tileId: 4,
        dispatcher: dispatcher,
        ut: viewUtils,
        mainForm: formModel,
        tilesModel: tilesModel,
        appServices: appServices,
        conf: tilesConf['TreqTileConf'] as TreqTileConf
    });
    attachTile(tiles, treqTile);


    ReactDOM.render(
        React.createElement(
            component.WdglanceMain,
            {
                tiles: Immutable.List<TileFrameProps>(tiles)
            }
        ),
        mountElement
    );
};