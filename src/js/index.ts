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
import * as Rx from '@reactivex/rxjs';
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
import {init as sydInit, SyDTileConf} from './tiles/syd/index';
import {init as freqPieInit, FreqPieTileConf} from './tiles/freqPie/index';
import {init as summaryInit, WordFreqTileConf} from './tiles/wordFreq/index';
import {init as MergeCorpFreqInit, MergeCorpFreqTileConf } from './tiles/mergeCorpFreq/index';
import { GlobalComponents, init as globalCompInit } from './views/global';
import * as translations from 'translations';
import { AppServices } from './appServices';
import { SystemNotifications } from './notifications';
import { ActionName, Actions } from './models/actions';
import { TileFrameProps, ITileProvider, QueryType, TileConf, TileFactory } from './abstract/types';
import { WdglanceTilesModel } from './models/tiles';
import {encodeArgs} from './shared/ajax';
import { Forms } from './shared/data';
import { MessagesModel } from './models/messages';
import { CorpusInfoAPI } from './shared/api/corpusInfo';
import {LayoutManager, LayoutConf} from './layout';

declare var require:(src:string)=>void;  // webpack
require('../css/index.less');
require('../css/components/global.less');
require('../css/components/main.less');
require('../css/mobile.less');
require('theme.less');


type AnyConf = ConcordanceTileConf | TTDistTileConf | TreqTileConf | SyDTileConf | FreqPieTileConf | TimeDistTileConf |
        CollocationsTileConf | WordFreqTileConf | MergeCorpFreqTileConf;

export interface WdglanceConf {
    uiLang:string;
    query1Lang:string;
    query2Lang:string;
    query1:string;
    query2:string;
    queryType:QueryType;
    rootUrl:string;
    hostUrl:string;
    corpInfoApiUrl:string;
    layouts:{[qt:string]:LayoutConf};
    tilesConf:{[ident:string]:AnyConf};
}


const mkAttachTile = (queryType:QueryType, lang1:string, lang2:string) =>
    (data:Array<TileFrameProps>, tile:ITileProvider, helpURL:string):void => {
    tile.init();
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


const attachNumericTileIdents = (config:{[ident:string]:AnyConf}):{[ident:string]:number} => {
    const ans = {};
    Object.keys(config).forEach((ident, i) => {
        if (!config[ident].isDisabled) {
            ans[ident] = i;
        }
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
        layoutManager:LayoutManager,
        queryType:QueryType,
        lang1:string,
        lang2:string,
        tileIdentMap:{[ident:string]:number}) => (
                confName:string,
                conf:AnyConf):ITileProvider|null => {

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
                    conf: conf
                });
            };

            switch (conf.tileType) {
                case 'ConcordanceTile':
                    return applyFactory<ConcordanceTileConf>(concInit, conf);
                case 'TTDistribTile':
                    return applyFactory<TTDistTileConf>(freqInit, conf);
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


export const init = (
    mountElement:HTMLElement,
    {
        uiLang,
        rootUrl,
        hostUrl,
        corpInfoApiUrl,
        query1Lang,
        query2Lang,
        queryType,
        query1,
        query2,
        layouts,
        tilesConf}:WdglanceConf) => {


    const uiLangSel = uiLang || 'en-US';
    const dispatcher = new ActionDispatcher();
    const viewUtils = new ViewUtils<GlobalComponents>({
        uiLang: uiLangSel,
        translations: translations,
        staticUrlCreator: (path) => rootUrl + 'assets/' + path,
        actionUrlCreator: (path, args) => hostUrl + path + '?' + encodeArgs(args)
    });

    const notifications = new SystemNotifications(dispatcher);
    const appServices = new AppServices(
        notifications,
        uiLang,
        viewUtils,
        viewUtils.createStaticUrl,
        viewUtils.createActionUrl
    );

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

    dispatcher.captureAction(
        ActionName.RequestQueryResponse,
        (action) => formModel.getState().isValid
    );

    const tiles:Array<TileFrameProps> = [];
    const attachTile = mkAttachTile(queryType, query1Lang, query2Lang);
    const tilesMap = attachNumericTileIdents(tilesConf);
    console.log('tilemap: ', tilesMap);

    const layoutManager = new LayoutManager(layouts, tilesMap, appServices);

    const factory = mkTileFactory(
        dispatcher,
        viewUtils,
        formModel,
        appServices,
        layoutManager,
        queryType,
        query1Lang,
        query2Lang,
        tilesMap
    );
    Object.keys(tilesConf).forEach((ident, i) => {
        if (!tilesConf[ident].isDisabled) {
            attachTile(
                tiles,
                factory(ident, tilesConf[ident]),
                appServices.importExternalMessage(tilesConf[ident].helpURL)
            );
        }
    });

    const MOBILE_MEDIA_QUERY = 'screen and (max-width: 900px) and (orientation:portrait)';

    const tilesModel = new WdglanceTilesModel(
        dispatcher,
        {
            isAnswerMode: false,
            isBusy: false,
            isMobile: window.matchMedia(MOBILE_MEDIA_QUERY).matches,
            tweakActiveTiles: Immutable.Set<number>(),
            helpActiveTiles:Immutable.Set<number>(),
            tilesHelpData: Immutable.Map<number, string>(),
            hiddenGroups:Immutable.Set<number>(),
            tileProps: Immutable.List<TileFrameProps>(tiles),
            isModalVisible: false,
            modalBoxData: null,
            modalBoxTitle: null
        },
        appServices,
        new CorpusInfoAPI(corpInfoApiUrl)
    );
    const messagesModel = new MessagesModel(dispatcher, appServices);
    const queryLangSwitchModel = new QueryLangChangeHandler(dispatcher, appServices);

    const component = viewInit(dispatcher, viewUtils, formModel, tilesModel, messagesModel);

    Rx.Observable.fromEvent(window, 'resize')
        .throttleTime(500)
        .subscribe(
            () => {
                const form = document.querySelector('.WdglanceControls');

                dispatcher.dispatch<Actions.SetScreenMode>({
                    name: ActionName.SetScreenMode,
                    payload: {
                        isMobile: window.matchMedia(MOBILE_MEDIA_QUERY).matches
                    }
                });
            }
        );

    ReactDOM.render(
        React.createElement(
            component.WdglanceMain,
            {
                layout: layoutManager.getLayout(queryType)
            }
        ),
        mountElement
    );
};