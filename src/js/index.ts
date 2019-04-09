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
import { CorpusInfoAPI } from './common/api/kontext/corpusInfo';
import { Theme } from './common/theme';
import { ITileProvider, LemmaVariant, QueryType, TileConf, TileFactory, TileFrameProps, ScreenProps } from './common/types';
import { AnyTileConf, ClientConf, UserConf } from './conf';
import { LayoutManager } from './layout';
import { ActionName, Actions } from './models/actions';
import { MessagesModel } from './models/messages';
import { defaultFactory as wdglanceFormFactory, WdglanceMainFormModel } from './models/query';
import { TileResultFlag, TileResultFlagRec, WdglanceTilesModel } from './models/tiles';
import { SystemNotifications } from './notifications';
import { CollocationsTileConf, init as collocInit } from './tiles/collocations';
import { ConcFilterTileConf, init as concFilterInit } from './tiles/concFilter';
import { ConcordanceTileConf, init as concInit } from './tiles/concordance';
import { EmptyTile } from './tiles/empty';
import { FreqBarTileConf, init as freqInit } from './tiles/freqBar';
import { FreqPieTileConf, init as freqPieInit } from './tiles/freqPie';
import { GeoAreasTileConf, init as geoAreasInit } from './tiles/geoAreas';
import { init as MergeCorpFreqInit, MergeCorpFreqTileConf } from './tiles/mergeCorpFreq';
import { init as sydInit, SyDTileConf } from './tiles/syd';
import { init as timeDistInit, TimeDistTileConf } from './tiles/timeDistrib';
import { init as treqInit, TreqTileConf } from './tiles/treq';
import {init as treqSubsetsInit, TreqSubsetsTileConf } from './tiles/treqSubsets';
import { init as summaryInit, WordFreqTileConf } from './tiles/wordFreq';
import { GlobalComponents, init as globalCompInit } from './views/global';
import { init as viewInit } from './views/main';

declare var require:(src:string)=>void;  // webpack
require('../css/index.less');
require('../css/components/global.less');
require('../css/components/main.less');
require('../css/mobile.less');
require('theme.less');


const mkAttachTile = (queryType:QueryType, lang1:string, lang2:string) =>
    (data:Array<TileFrameProps>, tile:ITileProvider, helpURL:string):void => {

    const support = tile.supportsQueryType(queryType, lang1, lang2);
    data.push({
        tileId: tile.getIdent(),
        Component: tile.getView(),
        label: tile.getLabel(),
        supportsTweakMode: tile.supportsTweakMode(),
        supportsCurrQueryType: support,
        supportsHelpView: tile.supportsHelpView(),
        supportsAltView: tile.supportsAltView(),
        renderSize: [50, 50],
        widthFract: tile.getWidthFract(),
        helpURL: helpURL,
    });
    if (!support) {
        tile.disable();
    }
};


const attachNumericTileIdents = (config:{[ident:string]:AnyTileConf}):{[ident:string]:number} => {
    const ans = {};
    Object.keys(config).forEach((k, i) => {
        ans[k] = i;
    });
    return ans;
};


const importDependsOnList = (d:string|Array<string>):Array<string> => {
    if (!d) {
        return [];

    } else if (typeof d === 'string') {
        return [d];
    }
    return d;
};


const mkTileFactory = (
        dispatcher:ActionDispatcher,
        viewUtils:ViewUtils<GlobalComponents>,
        mainForm:WdglanceMainFormModel,
        appServices:AppServices,
        theme:Theme,
        layoutManager:LayoutManager,
        queryType:QueryType,
        lang1:string,
        lang2:string,
        tileIdentMap:{[ident:string]:number}) => (
                confName:string,
                conf:AnyTileConf):ITileProvider|null => {

            const applyFactory = <T extends TileConf>(initFn:TileFactory.TileFactory<T>, conf:T) => {
                return initFn({
                    tileId: tileIdentMap[confName],
                    dispatcher: dispatcher,
                    ut: viewUtils,
                    mainForm: mainForm,
                    appServices: appServices,
                    lang1: lang1,
                    lang2: lang2,
                    waitForTiles: importDependsOnList(conf.dependsOn).map(v => tileIdentMap[v]),
                    widthFract: layoutManager.getTileWidthFract(queryType, tileIdentMap[confName]),
                    theme: theme,
                    conf: conf
                });
            };

            if (conf.isDisabled || !layoutManager.isInCurrentLayout(queryType, tileIdentMap[confName])) {
                return new EmptyTile(tileIdentMap[confName]);
            }

            switch (conf.tileType) {
                case 'ConcordanceTile':
                    return applyFactory<ConcordanceTileConf>(concInit, conf);
                case 'FreqBarTile':
                    return applyFactory<FreqBarTileConf>(freqInit, conf);
                case 'TimeDistribTile':
                    return applyFactory<TimeDistTileConf>(timeDistInit, conf);
                case 'CollocTile':
                    return applyFactory<CollocationsTileConf>(collocInit, conf);
                case 'TreqTile':
                    return applyFactory<TreqTileConf>(treqInit, conf);
                case 'TreqSubsetsTile':
                    return applyFactory<TreqSubsetsTileConf>(treqSubsetsInit, conf);
                case 'SyDTile':
                    return applyFactory<SyDTileConf>(sydInit, conf);
                case 'FreqPieTile':
                    return applyFactory<FreqPieTileConf>(freqPieInit, conf);
                case 'MergeCorpFreqTile':
                    return applyFactory<MergeCorpFreqTileConf>(MergeCorpFreqInit, conf);
                case 'WordFreqTile':
                    return applyFactory<WordFreqTileConf>(summaryInit, conf);
                case 'GeoAreasTile':
                    return applyFactory<GeoAreasTileConf>(geoAreasInit, conf);
                case 'ConcFilterTile':
                    return applyFactory<ConcFilterTileConf>(concFilterInit, conf);
                default:
                    return null;
            }
}


export const init = (mountElement:HTMLElement, config:ClientConf, userSession:UserConf, lemmas:Array<LemmaVariant>) => {

    const qType = userSession.queryType as QueryType; // TODO validate
    const uiLangSel = userSession.uiLang || 'en-US';
    const dispatcher = new ActionDispatcher();
    const viewUtils = new ViewUtils<GlobalComponents>({
        uiLang: uiLangSel,
        translations: translations,
        staticUrlCreator: (path) => config.rootUrl + 'assets/' + path,
        actionUrlCreator: (path, args) => config.hostUrl + path + (Object.keys(args || {}).length > 0 ? '?' + encodeArgs(args) : '')
    });

    const notifications = new SystemNotifications(dispatcher);
    const appServices = new AppServices({
        notifications: notifications,
        uiLang: userSession.uiLang,
        translator: viewUtils,
        staticUrlCreator: viewUtils.createStaticUrl,
        actionUrlCreator: viewUtils.createActionUrl,
        dbValuesMapping: config.dbValuesMapping || {},
        apiHeadersMapping: config.apiHeaders
    });
    //appServices.forceMobileMode(); // DEBUG

    const windowResize$:Observable<ScreenProps> = fromEvent(window, 'resize')
        .pipe(
            debounceTime(500),
            map(v => ({
                isMobile: appServices.isMobileMode(),
                innerWidth: window.innerWidth,
                innerHeight: window.innerHeight
            }))
        );

    const globalComponents = globalCompInit(dispatcher, viewUtils, windowResize$);
    viewUtils.attachComponents(globalComponents);
    const formModel = wdglanceFormFactory({
        dispatcher: dispatcher,
        appServices: appServices,
        query1: userSession.query1,
        query1Lang: userSession.query1Lang || 'cs',
        query2: userSession.query2,
        query2Lang: userSession.query2Lang || '',
        queryType: qType,
        lemmas: lemmas,
        isAnswerMode: userSession.answerMode
    });

    const tiles:Array<TileFrameProps> = [];
    const attachTile = mkAttachTile(
        qType,
        userSession.query1Lang,
        userSession.query2Lang
    );
    const tilesMap = attachNumericTileIdents(config.tiles);
    console.log('tiles map: ', tilesMap);
    const layoutManager = new LayoutManager(config.layouts, tilesMap, appServices);
    const theme = new Theme(config.colors);

    const factory = mkTileFactory(
        dispatcher,
        viewUtils,
        formModel,
        appServices,
        theme,
        layoutManager,
        qType,
        userSession.query1Lang,
        userSession.query2Lang,
        tilesMap
    );
    Object.keys(config.tiles).forEach((ident, i) => {
        attachTile(
            tiles,
            factory(ident, config.tiles[ident]),
            appServices.importExternalMessage(config.tiles[ident].helpURL)
        );
    });

    const tilesModel = new WdglanceTilesModel(
        dispatcher,
        {
            isAnswerMode: userSession.answerMode,
            isBusy: false,
            isMobile: appServices.isMobileMode(),
            tweakActiveTiles: Immutable.Set<number>(),
            helpActiveTiles: Immutable.Set<number>(),
            altViewActiveTiles: Immutable.Set<number>(),
            tilesHelpData: Immutable.Map<number, string>(),
            hiddenGroups: Immutable.Set<number>(),
            hiddenGroupsHeaders: Immutable.Set<number>(
                appServices.isMobileMode() ?
                    layoutManager.getLayout(qType).map((_, i) => i) :
                    []
            ),
            datalessGroups: Immutable.Set<number>(),
            tileResultFlags: layoutManager.getLayout(qType).reduce(
                (acc, curr, i) => acc.concat(curr.tiles.map<TileResultFlagRec>(v => ({
                    tileId: v.tileId,
                    groupId: i,
                    status: TileResultFlag.PENDING,
                }))).toList(),
                Immutable.List<TileResultFlagRec>()
            ),
            tileProps: Immutable.List<TileFrameProps>(tiles),
            isModalVisible: false,
            modalBoxData: null,
            modalBoxTitle: null
        },
        appServices,
        new CorpusInfoAPI(config.corpInfoApiUrl)
    );
    const messagesModel = new MessagesModel(dispatcher, appServices);

    const component = viewInit(dispatcher, viewUtils, formModel, tilesModel, messagesModel);

    windowResize$.subscribe(
        (props) => {
            dispatcher.dispatch<Actions.SetScreenMode>({
                name: ActionName.SetScreenMode,
                payload: props
            });
        }
    );

    ReactDOM.render(
        React.createElement(
            component.WdglanceMain,
            {
                layout: layoutManager.getLayout(qType),
                isMobile: appServices.isMobileMode(),
                isAnswerMode: userSession.answerMode
            }
        ),
        mountElement,
        () => {
            if (userSession.answerMode) {
                if (lemmas.find(v => v.isCurrent) && !userSession.error) {
                    dispatcher.dispatch({
                        name: ActionName.RequestQueryResponse
                    });

                } else {
                    dispatcher.dispatch({
                        name: ActionName.SetEmptyResult,
                        payload: {
                            error: userSession.error
                        }
                    });
                }
            }
        }
    );
};