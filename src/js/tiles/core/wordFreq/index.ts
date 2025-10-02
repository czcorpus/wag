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
import { IAppServices } from '../../../appServices.js';
import { QueryType } from '../../../query/index.js';
import {
    AltViewIconProps,
    DEFAULT_ALT_VIEW_ICON,
    ITileProvider,
    ITileReloader,
    TileComponent,
    TileConf,
    TileFactory,
    TileFactoryArgs,
} from '../../../page/tile.js';
import {
    FlevelDistribItem,
    SummaryModel,
    findCurrentMatches,
    mkEmptySimilarWords,
} from './model.js';
import { init as viewInit } from './views/index.js';
import { SimilarFreqWordsFrodoAPI } from './similarFreq.js';
import { CorpusInfoAPI } from '../../../api/vendor/mquery/corpusInfo.js';

export interface WordFreqTileConf extends TileConf {
    apiURL?: string;
    infoApiURL?: string;
    apiType?: string;
    corpname: string;
    corpusSize: number;
    sfwRowRange: number;
    flevelDistrib?: Array<FlevelDistribItem>;
}

const defaultFlevelDistrib = [
    { rel: 71.5079, flevel: 1.0 },
    { rel: 19.9711, flevel: 2.0 },
    { rel: 6.2886, flevel: 3.0 },
    { rel: 1.8387, flevel: 4.0 },
    { rel: 0.3606, flevel: 5.0 },
    { rel: 0.0293, flevel: 6.0 },
    { rel: 0.0037, flevel: 7.0 },
];

export class WordFreqTile implements ITileProvider {
    private readonly tileId: number;

    private readonly label: string;

    private readonly appServices: IAppServices;

    private readonly model: SummaryModel;

    private readonly widthFract: number;

    private readonly view: TileComponent;

    constructor({
        tileId,
        dispatcher,
        appServices,
        ut,
        queryMatches,
        widthFract,
        conf,
        isBusy,
        queryType,
        mainPosAttr,
        theme,
    }: TileFactoryArgs<WordFreqTileConf>) {
        this.tileId = tileId;
        this.appServices = appServices;
        this.widthFract = widthFract;
        this.label = this.appServices.importExternalMessage(conf.label);
        this.model = new SummaryModel({
            dispatcher,
            initialState: {
                isBusy: isBusy,
                error: null,
                corpname: conf.corpname,
                corpusSize: conf.corpusSize,
                similarFreqWords: mkEmptySimilarWords(queryMatches),
                queryMatches: findCurrentMatches(queryMatches),
                sfwRowRange: conf.sfwRowRange,
                flevelDistrb: conf.flevelDistrib
                    ? conf.flevelDistrib
                    : defaultFlevelDistrib,
                expandLemmaPos: null,
                mainPosAttr,
            },
            tileId,
            api: new SimilarFreqWordsFrodoAPI(
                queryType === QueryType.CMP_QUERY ? '' : conf.apiURL,
                appServices
            ),
            sourceInfoApi: new CorpusInfoAPI(
                conf.infoApiURL ? conf.infoApiURL : conf.apiURL,
                appServices
            ),
            queryMatches: queryMatches,
            queryType,
            appServices,
        });
        this.label = appServices.importExternalMessage(
            conf.label || 'freqpie__main_label'
        );
        this.view = viewInit(dispatcher, ut, this.model, theme);
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

    getSourceInfoComponent(): null {
        return null;
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
        return false;
    }

    supportsAltView(): boolean {
        return false;
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
        return true;
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
}

export const init: TileFactory<WordFreqTileConf> = {
    sanityCheck: (args) => [],
    create: (args) => new WordFreqTile(args),
};
