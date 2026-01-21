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
import { IAppServices } from '../../../appServices.js';
import { CorePosAttribute } from '../../../types.js';
import { findCurrQueryMatch, QueryType } from '../../../query/index.js';
import { CollocMetric, SrchContextType } from './common.js';
import { CollocModel } from './model.js';
import { init as viewInit } from './views.js';
import {
    TileConf,
    ITileProvider,
    TileComponent,
    TileFactory,
    TileFactoryArgs,
    DEFAULT_ALT_VIEW_ICON,
    ITileReloader,
    AltViewIconProps,
} from '../../../page/tile.js';
import { MQueryCollAPI } from './api/index.js';
import {
    PosQueryGeneratorType,
    validatePosQueryGenerator,
} from '../../../conf/common.js';

export interface CollocationsTileConf extends TileConf {
    apiURL: string;
    apiType: 'default' | 'with-examples';
    corpname: string;
    comparisonCorpname?: string;
    minFreq: number;
    minLocalFreq: number;
    rangeSize: number;
    maxItems?: number;
    examplesPerColl?: number;

    /**
     * A positional attribute name and a function id that creates a query value (e.g. ['tag', 'ppTagset']).
     */
    posQueryGenerator: PosQueryGeneratorType;

    supportsSublemma?: boolean;
}

/**
 *
 */
export class CollocationsTile implements ITileProvider {
    private readonly tileId: number;

    private readonly dispatcher: IActionDispatcher;

    private readonly appServices: IAppServices;

    private readonly model: CollocModel;

    private readonly widthFract: number;

    private readonly label: string;

    private view: TileComponent;

    private readonly api: MQueryCollAPI;

    private readonly dependentTiles: Array<number>;

    constructor({
        tileId,
        dispatcher,
        appServices,
        ut,
        theme,
        widthFract,
        conf,
        isBusy,
        queryMatches,
        queryType,
        dependentTiles,
    }: TileFactoryArgs<CollocationsTileConf>) {
        this.tileId = tileId;
        this.dispatcher = dispatcher;
        this.appServices = appServices;
        this.widthFract = widthFract;
        this.dependentTiles = dependentTiles;
        this.api = new MQueryCollAPI(
            conf.apiURL,
            conf.apiType === 'with-examples',
            appServices,
            conf.backlink
        );
        this.model = new CollocModel({
            dispatcher,
            tileId,
            dependentTiles,
            appServices,
            service: this.api,
            initState: {
                isBusy: isBusy,
                isTweakMode: false,
                isAltViewMode: false,
                tileId: tileId,
                widthFract: widthFract,
                error: null,
                corpname: conf.corpname,
                comparisonCorpname: conf.comparisonCorpname,
                selectedText: null,
                tokenAttr: CorePosAttribute.LEMMA,
                srchRange: conf.rangeSize,
                srchRangeType: SrchContextType.BOTH,
                minAbsFreq: conf.minFreq,
                minLocalAbsFreq: conf.minLocalFreq,
                appliedMetrics: [
                    CollocMetric.LOG_DICE,
                    CollocMetric.MI,
                    CollocMetric.T_SCORE,
                ],
                sortByMetric: CollocMetric.LOG_DICE,
                data: List.map((_) => null, queryMatches),
                heading: [],
                citemsperpage: conf.maxItems ? conf.maxItems : 10,
                backlinks: List.map((_) => null, queryMatches),
                queryMatches: List.map(
                    (v) => findCurrQueryMatch(v),
                    queryMatches
                ),
                queryType,
                posQueryGenerator: conf.posQueryGenerator,
                supportsSublemma: !!conf.supportsSublemma,
                examplesPerColl: conf.examplesPerColl,
            },
            queryMatches: List.map(findCurrQueryMatch, queryMatches),
        });
        this.label = appServices.importExternalMessage(
            conf.label || 'collocations__main_label'
        );
        this.view = viewInit(this.dispatcher, ut, theme, this.model);
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
        return (
            qt === QueryType.SINGLE_QUERY ||
            qt === QueryType.CMP_QUERY ||
            qt === QueryType.TRANSLAT_QUERY
        );
    }

    disable(): void {
        this.model.waitForAction({}, (_, syncData) => syncData);
    }

    getWidthFract(): number {
        return this.widthFract;
    }

    supportsTweakMode(): boolean {
        return this.api.supportsLeftRightContext();
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
}

export const init: TileFactory<CollocationsTileConf> = {
    sanityCheck: (args) => {
        const ans = [];
        if (
            typeof args.readDataFromTile === 'number' &&
            !List.empty(args.dependentTiles)
        ) {
            ans.push(
                new Error(
                    'the Colloc tile cannot have dependencies and be dependent on a tile at the same time'
                )
            );
        }
        if (
            !!args.conf.comparisonCorpname &&
            args.queryType === QueryType.CMP_QUERY
        ) {
            ans.push(
                new Error(
                    'collocation tile cannot work in both cmp and two corpora comparison mode at the same time'
                )
            );
        }
        const message = validatePosQueryGenerator(args.conf.posQueryGenerator);
        if (message) {
            ans.push(
                new Error(
                    `invalid posQueryGenerator in collocation tile, ${message}`
                )
            );
        }
        return ans;
    },

    create: (args) => new CollocationsTile(args),
};
