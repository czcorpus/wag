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
import {throttleTime} from 'rxjs/operators';
import {fromEvent, of as rxOf} from 'rxjs';
import {ActionDispatcher, ViewUtils, StatefulModel, Action } from 'kombo';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import {init as viewInit} from './views/main';
import {defaultFactory as wdglanceFormFactory, WdglanceMainFormModel } from './models/query';
import {init as concInit, ConcordanceTileConf} from './tiles/concordance/index';
import {init as freqInit, FreqBarTileConf} from './tiles/freqBar/index';
import {init as timeDistInit, TimeDistTileConf} from './tiles/timeDistrib/index';
import {init as collocInit, CollocationsTileConf} from './tiles/collocations/index';
import {init as treqInit, TreqTileConf} from './tiles/treq/index';
import {init as sydInit, SyDTileConf} from './tiles/syd/index';
import {init as freqPieInit, FreqPieTileConf} from './tiles/freqPie/index';
import {init as summaryInit, WordFreqTileConf} from './tiles/wordFreq/index';
import {init as MergeCorpFreqInit, MergeCorpFreqTileConf } from './tiles/mergeCorpFreq/index';
import {init as geoAreasInit, GeoAreasTileConf} from './tiles/geoAreas/index';
import {init as similarFreqsInit, SimilarFreqsTileConf} from './tiles/similarFreqs';
import {GlobalComponents, init as globalCompInit } from './views/global';
import * as translations from 'translations';
import {AppServices } from './appServices';
import {SystemNotifications } from './notifications';
import {ActionName, Actions } from './models/actions';
import {TileFrameProps, ITileProvider, QueryType, TileConf, TileFactory, DbValueMapping, HTTPHeaders } from './common/types';
import {WdglanceTilesModel, TileResultFlagRec, TileResultFlag } from './models/tiles';
import {encodeArgs} from './common/ajax';
import {MessagesModel } from './models/messages';
import {CorpusInfoAPI } from './common/api/kontext/corpusInfo';
import {LayoutManager} from './layout';
import {Theme } from './common/theme';
import {ClientConf, UserConf, AnyTileConf } from './conf';
import {EmptyTile } from './tiles/empty';

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
                case 'SimilarFreqsTile':
                    return applyFactory<SimilarFreqsTileConf>(similarFreqsInit, conf);
                default:
                    return null;
            }
}


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


export const init = (mountElement:HTMLElement, config:ClientConf, userConfig:UserConf) => {

    const qType = userConfig.queryType as QueryType; // TODO validate
    const uiLangSel = userConfig.uiLang || 'en-US';
    const dispatcher = new ActionDispatcher();
    const viewUtils = new ViewUtils<GlobalComponents>({
        uiLang: uiLangSel,
        translations: translations,
        staticUrlCreator: (path) => config.rootUrl + 'assets/' + path,
        actionUrlCreator: (path, args) => config.hostUrl + path + '?' + encodeArgs(args)
    });

    const notifications = new SystemNotifications(dispatcher);
    const appServices = new AppServices({
        notifications: notifications,
        uiLang: userConfig.uiLang,
        translator: viewUtils,
        staticUrlCreator: viewUtils.createStaticUrl,
        actionUrlCreator: viewUtils.createActionUrl,
        dbValuesMapping: config.dbValuesMapping || {},
        apiHeadersMapping: config.apiHeaders
    });
    //appServices.forceMobileMode(); // DEBUG

    const globalComponents = globalCompInit(dispatcher, viewUtils);
    viewUtils.attachComponents(globalComponents);
    const formModel = wdglanceFormFactory({
        dispatcher: dispatcher,
        appServices: appServices,
        query1: userConfig.query1,
        query1Lang: userConfig.query1Lang || '',
        query2: userConfig.query2,
        query2Lang: userConfig.query2Lang || '',
        queryType: qType
    });

    const tiles:Array<TileFrameProps> = [];
    const attachTile = mkAttachTile(
        qType,
        userConfig.query1Lang,
        userConfig.query2Lang
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
        userConfig.query1Lang,
        userConfig.query2Lang,
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
            isAnswerMode: userConfig.answerMode,
            isBusy: false,
            isMobile: appServices.isMobileMode(),
            tweakActiveTiles: Immutable.Set<number>(),
            helpActiveTiles: Immutable.Set<number>(),
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
    const queryLangSwitchModel = new QueryLangChangeHandler(dispatcher, appServices);

    const component = viewInit(dispatcher, viewUtils, formModel, tilesModel, messagesModel);

    fromEvent(window, 'resize')
        .pipe(throttleTime(500))
        .subscribe(
            () => {
                dispatcher.dispatch<Actions.SetScreenMode>({
                    name: ActionName.SetScreenMode,
                    payload: {
                        isMobile: appServices.isMobileMode()
                    }
                });
            }
        );

    ReactDOM.render(
        React.createElement(
            component.WdglanceMain,
            {
                layout: layoutManager.getLayout(qType),
                isMobile: appServices.isMobileMode()
            }
        ),
        mountElement,
        () => {
            if (userConfig.answerMode) {
                dispatcher.dispatch(rxOf(
                    {
                        name: ActionName.RequestQueryResponse
                    }
                ));
            }
        }
    );
};