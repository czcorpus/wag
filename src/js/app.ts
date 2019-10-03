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

/*
 * The module contains core initialization for both
 * server and client applications
 */
import * as React from 'react';
import * as Immutable from 'immutable';
import { Observable, of as rxOf } from 'rxjs';

import { CorpusInfoAPI } from './common/api/kontext/corpusInfo';
import { Theme } from './common/theme';
import { AvailableLanguage, ScreenProps } from './common/hostPage';
import { LemmaVariant, QueryType, SearchLanguage } from './common/query';
import { ITileProvider, TileFrameProps } from './common/tile';
import { AnyTileConf, ClientConf, UserConf } from './conf';
import { LayoutManager, TileGroup } from './layout';
import { ActionName, Actions } from './models/actions';
import { MessagesModel } from './models/messages';
import { defaultFactory as mainFormFactory } from './models/query';
import { TileResultFlag, TileResultFlagRec, WdglanceTilesModel } from './models/tiles';
import { GlobalComponents, init as globalCompInit } from './views/global';
import { init as viewInit, WdglanceMainProps } from './views/main';
import { RetryTileLoad } from './models/retryLoad';
import { ViewUtils, IFullActionControl } from 'kombo';
import { AppServices } from './appServices';
import { IAsyncKeyValueStore, TileIdentMap } from './common/types';


const mkAttachTile = (queryType:QueryType, lang1:string, lang2:string) =>
    (data:Array<TileFrameProps>, tile:ITileProvider, helpURL:string):void => {

    const support = tile.supportsQueryType(queryType, lang1, lang2);
    data.push({
        tileId: tile.getIdent(),
        Component: tile.getView(),
        SourceInfoComponent: tile.getSourceInfoView(),
        label: tile.getLabel(),
        supportsTweakMode: tile.supportsTweakMode(),
        supportsCurrQueryType: support,
        supportsHelpView: !!helpURL,
        supportsAltView: tile.supportsAltView(),
        renderSize: [50, 50],
        widthFract: tile.getWidthFract(),
        helpURL: helpURL,
        supportsReloadOnError: tile.exposeModelForRetryOnError() !== null
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


export interface InitIntArgs {
    config:ClientConf;
    userSession:UserConf;
    lemmas:Array<LemmaVariant>;
    appServices:AppServices;
    dispatcher:IFullActionControl;
    onResize:Observable<ScreenProps>;
    viewUtils:ViewUtils<GlobalComponents>;
    cache:IAsyncKeyValueStore;
}


export function createRootComponent({config, userSession, lemmas, appServices, dispatcher,
    onResize, viewUtils, cache}:InitIntArgs):[React.FunctionComponent<WdglanceMainProps>, Immutable.List<TileGroup>, TileIdentMap] {

    const qType = userSession.queryType as QueryType; // TODO validate
    const globalComponents = globalCompInit(dispatcher, viewUtils, onResize);
    viewUtils.attachComponents(globalComponents);

    const tiles:Array<TileFrameProps> = [];
    const attachTile = mkAttachTile(
        qType,
        userSession.query1Lang,
        userSession.query2Lang
    );
    const tilesMap = attachNumericTileIdents(config.tiles);
    const layoutManager = new LayoutManager(config.layouts, tilesMap, appServices);
    const theme = new Theme(config.colors);

    const retryLoadModel = new RetryTileLoad(dispatcher);

    const formModel = mainFormFactory({
        dispatcher: dispatcher,
        appServices: appServices,
        query1: userSession.query1,
        query1Lang: userSession.query1Lang || 'cs',
        query2: userSession.query2,
        query2Lang: userSession.query2Lang || '',
        queryType: qType,
        lemmas: lemmas,
        isAnswerMode: userSession.answerMode,
        uiLanguages: Immutable.List<AvailableLanguage>(
            Object.keys(userSession.uiLanguages).map(k => [k, userSession.uiLanguages[k]])),
        searchLanguages: Immutable.List<SearchLanguage>(config.searchLanguages),
        layout: layoutManager
    });

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
        tilesMap,
        cache
    );
    Object.keys(config.tiles).forEach(tileId => {
        const tile = factory(tileId, config.tiles[tileId]);
        attachTile(
            tiles,
            tile,
            appServices.importExternalMessage(config.tiles[tile.getIdent()].helpURL)
        );
        retryLoadModel.registerModel(
            tilesMap[tile.getIdent()],
            tile.exposeModelForRetryOnError(),
            tile.getBlockingTiles()
        );
    });
    //console.log('tiles map: ', tilesMap);

    const tilesModel = new WdglanceTilesModel(
        dispatcher,
        {
            isAnswerMode: userSession.answerMode,
            isBusy: false,
            isMobile: appServices.isMobileMode(),
            tweakActiveTiles: Immutable.Set<number>(),
            altViewActiveTiles: Immutable.Set<number>(),
            hiddenGroups: Immutable.Set<number>(),
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
            activeSourceInfo: null,
            activeGroupHelp: null,
            activeTileHelp: null
        },
        appServices,
        new CorpusInfoAPI(cache, config.corpInfoApiUrl)
    );
    const messagesModel = new MessagesModel(dispatcher, appServices);

    const component = viewInit(dispatcher, viewUtils, formModel, tilesModel, messagesModel);

    onResize.subscribe(
        (props) => {
            dispatcher.dispatch<Actions.SetScreenMode>({
                name: ActionName.SetScreenMode,
                payload: props
            });
        }
    );

    return [component, layoutManager.getLayout(qType), tilesMap];
}