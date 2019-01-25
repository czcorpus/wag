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
import { ActionDispatcher, ViewUtils, StatefulModel, Action } from 'kombo';
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
import { ActionName } from './models/actions';
import { TileFrameProps, ITileProvider, QueryType } from './abstract/types';
import { WdglanceTilesModel } from './models/tiles';
import {encodeArgs} from './shared/ajax';
import { Forms } from './shared/data';

declare var require:(src:string)=>void;  // webpack
require('../css/index.less');
require('../css/components/global.less');
require('../css/components/main.less');
require('../css/mobile.less');


export interface WdglanceConf {
    uiLang:string;
    query1Lang:string;
    query2Lang:string;
    query1:string;
    query2:string;
    queryType:QueryType;
    rootUrl:string;
    hostUrl:string;
    tilesConf:{[ident:string]:any};
}

const attachTile = (queryType:QueryType, lang1:string, lang2:string) =>
    (data:Array<TileFrameProps>, tile:ITileProvider):void => {
    tile.init();
    data.push({
        tileId: tile.getIdent(),
        Component: tile.getView(),
        label: tile.getLabel(),
        supportsExtendedView: tile.supportsExtendedView(),
        queryTypeSupport: tile.getQueryTypeSupport(queryType, lang1, lang2)
    });
};


class QueryLangChangeHandler extends StatefulModel<{}> {

    private readonly appServices:AppServices;

    constructor(dispatcher:ActionDispatcher, appServices:AppServices) {
        super(dispatcher, {});
        this.appServices = appServices;
    }

    onAction(action:Action): void {
        switch (action.name) {
            case ActionName.ChangeTargetLanguage:
                window.location.href = this.appServices.createActionUrl('', {
                    lang1: action.payload['lang1'],
                    lang2: action.payload['lang2'],
                    queryType: action.payload['queryType'],
                    q1: action.payload['q1'],
                    q2: action.payload['q2']
                });
            break;
            case ActionName.ChangeQueryType:
                window.location.href = this.appServices.createActionUrl('', {
                    lang1: action.payload['lang1'],
                    lang2: action.payload['lang2'],
                    queryType: action.payload['queryType'],
                    q1: action.payload['q1'],
                    q2: action.payload['q2']
                });
            break;
        }
    }

}


export const init = (mountElement:HTMLElement,
            {uiLang, rootUrl, hostUrl, query1Lang, query2Lang, queryType, query1, query2, tilesConf}:WdglanceConf) => {
    const dispatcher = new ActionDispatcher();
    const viewUtils = new ViewUtils<GlobalComponents>({
        uiLang: uiLang || 'en_US',
        translations: translations,
        staticUrlCreator: (path) => rootUrl + 'assets/' + path,
        actionUrlCreator: (path, args) => hostUrl + path + '?' + encodeArgs(args)
    });

    const notifications = new SystemNotifications(dispatcher);
    const appServices = new AppServices(notifications, viewUtils, viewUtils.createStaticUrl, viewUtils.createActionUrl);

    const globalComponents = globalCompInit(dispatcher, viewUtils);
    viewUtils.attachComponents(globalComponents);
    const formModel = new WdglanceMainFormModel(
        dispatcher,
        appServices,
        {
            query: Forms.newFormValue(query1 || '', true),
            query2: Forms.newFormValue(query2 || '', false),
            queryType: queryType,
            availQueryTypes: Immutable.List<[QueryType, string]>([
                [QueryType.SINGLE_QUERY, appServices.translate('global__single_word_sel')],
                [QueryType.CMP_QUERY, appServices.translate('global__two_words_compare')],
                [QueryType.TRANSLAT_QUERY, appServices.translate('global__word_translate')]
            ]),
            targetLanguage: query1Lang || '',
            targetLanguage2: query2Lang || '',
            availLanguages: Immutable.List<[string, string]>([
                ['cs', 'čeština'],
                ['en', 'English'],
                ['de', 'Deutsch']
            ]),
            isValid: true,
        }

    );
    const tilesModel = new WdglanceTilesModel(
        dispatcher,
        appServices
    );
    dispatcher.captureAction(
        ActionName.RequestQueryResponse,
        (action) => formModel.getState().isValid
    );

    const component = viewInit(dispatcher, viewUtils, formModel, tilesModel);

    const queryLangSwitchModel = new QueryLangChangeHandler(dispatcher, appServices);

    const tiles:Array<TileFrameProps> = [];

    const initialLang = 'cs'; // TODO use HTTP info or some cookie stuff

    const attachTileCurr = attachTile(queryType, query1Lang, query2Lang);

    // window conc. -------------------------------------------------
    if (tilesConf['ConcordanceTileConf']) {
        attachTileCurr(tiles, concInit({
            tileId: 0,
            dispatcher: dispatcher,
            ut: viewUtils,
            mainForm: formModel,
            tilesModel: tilesModel,
            appServices: appServices,
            lang1: query1Lang,
            lang2: query2Lang,
            conf: tilesConf['ConcordanceTileConf'] as ConcordanceTileConf
        }));
    }

    // window freq. --------------------------------------------------
    if (tilesConf['TTDistTileConf']) {
        attachTileCurr(tiles, freqInit({
            tileId: 1,
            dispatcher: dispatcher,
            ut: viewUtils,
            mainForm: formModel,
            tilesModel: tilesModel,
            appServices: appServices,
            lang1: query1Lang,
            lang2: query2Lang,
            conf: tilesConf['TTDistTileConf'] as TTDistTileConf
        }));
    }

    // window colloc. --------------------------------------------------
    if (tilesConf['CollocationsTileConf']) {
        attachTileCurr(tiles, collocInit({
            tileId: 2,
            dispatcher: dispatcher,
            ut: viewUtils,
            mainForm: formModel,
            tilesModel: tilesModel,
            appServices: appServices,
            lang1: query1Lang,
            lang2: query2Lang,
            conf: tilesConf['CollocationsTileConf'] as CollocationsTileConf
        }));
    }

    // window time distrib. -------------------------------------------------
    if (tilesConf['TimeDistTileConf']) {
        attachTileCurr(tiles, timeDistInit({
            tileId: 3,
            dispatcher: dispatcher,
            ut: viewUtils,
            mainForm: formModel,
            tilesModel: tilesModel,
            appServices: appServices,
            lang1: query1Lang,
            lang2: query2Lang,
            conf: tilesConf['TimeDistTileConf'] as TimeDistTileConf
        }));
    }

    // window treq. --------------------------------------------------
    if (tilesConf['TreqTileConf']) {
        attachTileCurr(tiles, treqInit({
            tileId: 4,
            dispatcher: dispatcher,
            ut: viewUtils,
            mainForm: formModel,
            tilesModel: tilesModel,
            appServices: appServices,
            lang1: query1Lang,
            lang2: query2Lang,
            conf: tilesConf['TreqTileConf'] as TreqTileConf,
        }));
    }


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