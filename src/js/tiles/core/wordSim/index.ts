/*
 * Copyright 2019 Tomas Machalek <tomas.machalek@gmail.com>
 * Copyright 2019 Institute of the Czech National Corpus,
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
import { IActionDispatcher } from 'kombo';
import { List } from 'cnc-tskit';
import {
    TileConf,
    ITileProvider,
    TileFactory,
    TileComponent,
    TileFactoryArgs,
    DEFAULT_ALT_VIEW_ICON,
    ITileReloader,
    AltViewIconProps,
} from '../../../page/tile.js';
import { WordSimModel } from './model.js';
import { IAppServices } from '../../../appServices.js';
import { init as viewInit } from './view.js';
import { findCurrQueryMatch, QueryType } from '../../../query/index.js';
import { CNCWord2VecSimApi, OperationMode } from './api/standard.js';
import { CNCWSServerApi } from './api/wss.js';

export interface WordSimTileConf extends TileConf {
    apiURL: string;
    apiType?: 'wss' | 'default';
    maxResultItems: number;
    minMatchFreq: number;
    minScore?: number;
    corpname?: string;
    model?: string;
}

/**
 *
 */
export class WordSimTile implements ITileProvider {
    private readonly tileId: number;

    private readonly dispatcher: IActionDispatcher;

    private readonly model: WordSimModel;

    private readonly appServices: IAppServices;

    private readonly view: TileComponent;

    private readonly srcInfoView: React.FC;

    private readonly label: string;

    private readonly widthFract: number;

    private readonly api: CNCWord2VecSimApi | CNCWSServerApi;

    constructor({
        tileId,
        dispatcher,
        appServices,
        ut,
        widthFract,
        conf,
        theme,
        isBusy,
        queryMatches,
    }: TileFactoryArgs<WordSimTileConf>) {
        this.tileId = tileId;
        this.dispatcher = dispatcher;
        this.appServices = appServices;
        this.widthFract = widthFract;
        this.label = appServices.importExternalMessage(
            conf.label || 'wordsim__main_label'
        );
        this.api =
            conf.apiType === 'wss'
                ? new CNCWSServerApi(conf.apiURL, conf.srcInfoURL, appServices)
                : new CNCWord2VecSimApi(
                      conf.apiURL,
                      conf.srcInfoURL,
                      appServices
                  );
        this.model = new WordSimModel({
            appServices,
            dispatcher,
            initState: {
                isBusy: isBusy,
                isMobile: appServices.isMobileMode(),
                isAltViewMode: false,
                error: null,
                isTweakMode: false,
                data: List.repeat((_) => [], queryMatches.length),
                maxResultItems: conf.maxResultItems,
                operationMode: OperationMode.MeansLike,
                corpus: conf.corpname || '',
                model: conf.model || '',
                minScore: conf.minScore || 0,
                minMatchFreq: conf.minMatchFreq,
                queryMatches: List.map(
                    (lemma) => findCurrQueryMatch(lemma),
                    queryMatches
                ),
                selectedText: null,
            },
            tileId,
            api: this.api,
        });
        this.view = viewInit(dispatcher, ut, theme, this.model);
    }

    getIdent(): number {
        return this.tileId;
    }

    getLabel(): string {
        return this.label;
    }

    getView(): TileComponent {
        return this.view;
    }

    getSourceInfoComponent(): React.FC {
        return this.srcInfoView;
    }

    supportsQueryType(qt: QueryType, translatLang?: string): boolean {
        return qt === QueryType.SINGLE_QUERY || qt === QueryType.CMP_QUERY;
    }

    disable(): void {
        this.model.waitForAction({}, (_, syncData) => syncData);
    }

    getWidthFract(): number {
        return this.widthFract;
    }

    supportsTweakMode(): boolean {
        return this.api.supportsTweaking();
    }

    supportsAltView(): boolean {
        return true;
    }

    supportsSVGFigureSave(): boolean {
        return false;
    }

    getAltViewIcon(): AltViewIconProps {
        return DEFAULT_ALT_VIEW_ICON;
    }

    registerReloadModel(model: ITileReloader): boolean {
        model.registerModel(this, this.model);
        return true;
    }

    supportsMultiWordQueries(): boolean {
        return this.api.supportsMultiWordQueries();
    }

    getIssueReportingUrl(): null {
        return null;
    }

    getReadDataFrom(): number | null {
        return null;
    }

    hideOnNoData(): boolean {
        return false;
    }

    supportsSublemma(): boolean {
        return true;
    }
}

export const init: TileFactory<WordSimTileConf> = {
    sanityCheck: (args) => [],

    create: (args) => new WordSimTile(args),
};
