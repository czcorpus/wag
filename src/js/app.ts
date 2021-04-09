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
import { Observable } from 'rxjs';
import { Theme } from './page/theme';
import { ScreenProps } from './page/hostPage';
import { QueryType, RecognizedQueries, testIsMultiWordMode } from './query/index';
import { ITileProvider, TileFrameProps, TileConf } from './page/tile';
import { ClientConf, UserConf } from './conf';
import { LayoutManager, TileGroup, GroupedTileProps } from './page/layout';
import { Actions } from './models/actions';
import { MessagesModel } from './models/messages';
import { defaultFactory as mainFormFactory } from './models/query';
import { TileResultFlag, WdglanceTilesModel } from './models/tiles';
import { GlobalComponents, init as globalCompInit } from './views/common';
import { init as viewInit, WdglanceMainProps } from './views/main';
import { RetryTileLoad } from './models/retryLoad';
import { ViewUtils, IFullActionControl } from 'kombo';
import { IAppServices } from './appServices';
import { IAsyncKeyValueStore, TileIdentMap } from './types';
import { mkTileFactory } from './page/tileLoader';
import { List, pipe, Dict } from 'cnc-tskit';


interface AttachTileArgs {
    data:Array<TileFrameProps>;
    tileName:string;
    tile:ITileProvider;
    helpURL:string;
    issueReportingURL:string;
    maxTileHeight:string;
}

const mkAttachTile = (queryType:QueryType, isMultiWordQuery:boolean, domain1:string, domain2:string, appServices:IAppServices) =>
    ({data, tileName, tile, helpURL, issueReportingURL, maxTileHeight}:AttachTileArgs):void => {
        const support = tile.supportsQueryType(queryType, domain1, domain2) && (!isMultiWordQuery || tile.supportsMultiWordQueries());
        let reasonDisabled = undefined;
        if (!tile.supportsQueryType(queryType, domain1, domain2)) {
            reasonDisabled = appServices.translate('global__query_type_not_supported');

        } else if (isMultiWordQuery && !tile.supportsMultiWordQueries()) {
            reasonDisabled = appServices.translate('global__multi_word_query_not_supported');
        }

        data.push({
            tileId: tile.getIdent(),
            tileName: tileName,
            Component: tile.getView(),
            SourceInfoComponent: tile.getSourceInfoComponent(),
            label: tile.getLabel(),
            supportsTweakMode: tile.supportsTweakMode(),
            issueReportingUrl: tile.getIssueReportingUrl() || issueReportingURL,
            supportsCurrQuery: support,
            reasonTileDisabled: reasonDisabled,
            supportsHelpView: !!helpURL,
            supportsAltView: tile.supportsAltView(),
            renderSize: [50, 50],
            widthFract: tile.getWidthFract(),
            maxTileHeight: maxTileHeight,
            helpURL: helpURL,
            supportsReloadOnError: tile.exposeModel() !== null // TODO this inference is debatable
        });
        if (!support) {
            tile.disable();
        }
};

const attachNumericTileIdents = (config:{[ident:string]:TileConf}):{[ident:string]:number} => {
    const ans = {};
    Object.keys(config).forEach((k, i) => {
        ans[k] = i;
    });
    return ans;
};


export interface InitIntArgs {
    config:ClientConf;
    userSession:UserConf;
    queryMatches:RecognizedQueries;
    appServices:IAppServices;
    dispatcher:IFullActionControl;
    onResize:Observable<ScreenProps>;
    viewUtils:ViewUtils<GlobalComponents>;
    cache:IAsyncKeyValueStore;
}


export function createRootComponent({config, userSession, queryMatches, appServices, dispatcher,
    onResize, viewUtils, cache}:InitIntArgs):[React.FunctionComponent<WdglanceMainProps>, Array<TileGroup>, TileIdentMap] {

    const globalComponents = globalCompInit(dispatcher, viewUtils, onResize);
    viewUtils.attachComponents(globalComponents);

    const tiles:Array<TileFrameProps> = [];
    const tilesMap = attachNumericTileIdents(config.tiles);
    const layoutManager = new LayoutManager(config.layouts, tilesMap, appServices);
    const theme = new Theme(config.colors);

    const qType = userSession.queryType as QueryType; // TODO validate
    const dfltDomainSrch = List.find(v => List.some(v2 => v2 === qType, v.queryTypes), config.searchDomains);
    const dfltDomain = dfltDomainSrch ?
        dfltDomainSrch :
        { code: 'en', label: 'English', queryTypes: [QueryType.CMP_QUERY, QueryType.SINGLE_QUERY, QueryType.TRANSLAT_QUERY]};

    const formModel = mainFormFactory({
        dispatcher: dispatcher,
        appServices: appServices,
        query1Domain: userSession.query1Domain || dfltDomain.code,
        query2Domain: userSession.query2Domain || '',
        queryType: qType,
        queryMatches: queryMatches,
        isAnswerMode: userSession.answerMode,
        uiLanguages: Object.keys(userSession.uiLanguages).map(k => ({code: k, label: userSession.uiLanguages[k]})),

        searchDomains: config.searchDomains,
        layout: layoutManager,
        maxCmpQueries: 10,
        maxQueryWords: config.maxQueryWords
    });

    const factory = mkTileFactory(
        dispatcher,
        viewUtils,
        queryMatches,
        appServices,
        theme,
        layoutManager,
        qType,
        userSession.query1Domain,
        userSession.query2Domain,
        tilesMap,
        cache
    );

    const isMultiWordQuery = testIsMultiWordMode(queryMatches);
    const attachTile = mkAttachTile(
        qType,
        isMultiWordQuery,
        userSession.query1Domain,
        userSession.query2Domain,
        appServices
    );
    const retryLoadModel = new RetryTileLoad(dispatcher);
    Dict.forEach(
        (tileConf, tileId) => {
            const tile = factory(tileId, tileConf);
            attachTile({
                data: tiles,
                tileName: tileId,
                tile,
                helpURL: appServices.importExternalMessage(tileConf.helpURL),
                issueReportingURL: config.issueReportingUrl,
                maxTileHeight: tileConf.maxTileHeight
            });
            const model = tile.exposeModel();
            retryLoadModel.registerModel(
                tilesMap[tileId],
                model,
                tile.getBlockingTiles()
            );
            if (isMultiWordQuery && !tile.supportsMultiWordQueries()) {
                model.suspend({}, (_, syncData) => syncData);
            }
        },
        config.tiles
    );

    const tilesModel = new WdglanceTilesModel(
        dispatcher,
        {
            isAnswerMode: userSession.answerMode,
            isBusy: false,
            isMobile: appServices.isMobileMode(),
            tweakActiveTiles: [],
            altViewActiveTiles: [],
            hiddenGroups: [],
            datalessGroups: [],
            tileResultFlags: pipe(
                layoutManager.getLayoutGroups(qType),
                List.flatMap(
                    (v, groupIdx) => List.map(v2 => [groupIdx, v2] as [number, GroupedTileProps],
                        v.tiles)
                ),
                List.map(([groupIdx, v], _) => ({
                    tileId: v.tileId,
                    groupId: groupIdx,
                    status: TileResultFlag.PENDING,
                    canBeAmbiguousResult: false
                }))
            ),
            tileProps: tiles,
            activeSourceInfo: null,
            activeGroupHelp: null,
            activeTileHelp: null,
            showAmbiguousResultHelp: false,
            maxTileErrors: config.maxTileErrors,
            numTileErrors: 0,
            issueReportingUrl: config.issueReportingUrl || null,
            highlightedTileId: -1,
            scrollToTileId: -1,
            allTilesLoaded: false
        },
        appServices
    );
    const messagesModel = new MessagesModel(dispatcher, appServices);

    const component = viewInit(dispatcher, viewUtils, formModel, tilesModel, messagesModel);

    onResize.subscribe(
        (props) => {
            dispatcher.dispatch<typeof Actions.SetScreenMode>({
                name: Actions.SetScreenMode.name,
                payload: props
            });
        }
    );

    return [component, layoutManager.getLayoutGroups(qType), tilesMap];
}