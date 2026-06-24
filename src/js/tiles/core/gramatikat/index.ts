/*
 * Copyright 2026 Tomas Machalek <tomas.machalek@gmail.com>
 * Copyright 2026 Department of Linguistics,
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

import {
    findCurrQueryMatch,
    LemmatizationLevel,
    QueryType,
} from '../../../query/index.js';
import { IAppServices } from '../../../appServices.js';
import {
    AltViewIconProps,
    DEFAULT_ALT_VIEW_ICON,
    ITileProvider,
    ITileReloader,
    SourceInfoComponent,
    TileComponent,
    TileConf,
    TileFactory,
    TileFactoryArgs,
} from '../../../page/tile.js';
import { GramatikatModel } from './model.js';
import { GramatikatAPI } from './api.js';
import { init as viewInit } from './views/index.js';
import { List } from 'cnc-tskit';
import { findCurrentMatches } from '../wordFreq/model.js';

export interface GramatikatTileConf extends TileConf {
    apiUrl: string;
}

export class GramatikatTile implements ITileProvider {
    private readonly tileId: number;

    private readonly label: string;

    private readonly appServices: IAppServices;

    private readonly model: GramatikatModel;

    private readonly widthFract: number;

    private readonly view: TileComponent;

    private readonly configuredLemLevels: Array<LemmatizationLevel>;

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
        dependentTiles,
    }: TileFactoryArgs<GramatikatTileConf>) {
        this.tileId = tileId;
        this.appServices = appServices;
        this.widthFract = widthFract;
        this.label = this.appServices.importExternalMessage(
            conf.label || 'gramatikat__main_label'
        );

        this.model = new GramatikatModel({
            dispatcher,
            initState: {
                isAltViewMode: false,
                isTweakMode: false,
                backlinks: [],
                corpname: 'syn2015_20_25', // TODO configurable
                currQueryMatches: List.map(
                    (match) => findCurrQueryMatch(match),
                    queryMatches
                ),
                data: [],
                error: undefined,
                message: undefined,
                words: List.map(
                    (v) => v.word,
                    findCurrentMatches(queryMatches)
                ),
                viewOptions: {
                    heatmaps: {
                        verbs: [
                            {
                                conf: {
                                    label: 'cislopad',
                                    columnsProps: ['polarity', 'tense'],
                                    activeGroupedColVals: {},
                                    switchableGroupColVals: false,
                                    columnsTags: [
                                        'A-P',
                                        'A-R',
                                        'A-F',
                                        'A-B',
                                        'A-Q',
                                        'N-P',
                                        'N-R',
                                        'N-F',
                                        'N-B',
                                        'N-Q',
                                    ],
                                    rowsProp: 'number',
                                    rowsTags: ['S', 'P', 'D'],
                                },
                                isActive: true,
                            },
                        ],
                        adjectives: [
                            {
                                conf: {
                                    label: 'cislopad',
                                    columnsProps: ['degree', 'gender'],
                                    activeGroupedColVals: { '1': true },
                                    switchableGroupColVals: true,
                                    columnsTags: [
                                        '1-F',
                                        '1-I',
                                        '1-M',
                                        '1-N',
                                        '2-F',
                                        '2-I',
                                        '2-M',
                                        '2-N',
                                        '3-F',
                                        '3-I',
                                        '3-M',
                                        '3-N',
                                    ],
                                    rowsProp: 'case',
                                    rowsTags: [
                                        '1',
                                        '2',
                                        '3',
                                        '4',
                                        '5',
                                        '6',
                                        '7',
                                    ],
                                },
                                isActive: true,
                            },
                        ],
                        nouns: [
                            {
                                conf: {
                                    label: 'cislopad',
                                    columnsProps: ['gender', 'number'],
                                    activeGroupedColVals: {},
                                    switchableGroupColVals: false,
                                    columnsTags: [
                                        'F-D',
                                        'F-P',
                                        'F-S',
                                        'I-D',
                                        'I-P',
                                        'I-S',
                                        'M-D',
                                        'M-P',
                                        'M-S',
                                        'N-D',
                                        'N-P',
                                        'N-S',
                                    ],
                                    rowsTags: [
                                        '1',
                                        '2',
                                        '3',
                                        '4',
                                        '5',
                                        '6',
                                        '7',
                                    ],
                                    rowsProp: 'case',
                                },
                                isActive: true,
                            },
                        ],
                    },
                },
                isBusy,
            },
            tileId,
            appServices,
            queryMatches,
            dependentTiles,
            api: new GramatikatAPI(conf.apiUrl),
            lemLevelSupport: this.configuredLemLevels,
        });
        this.view = viewInit(dispatcher, ut, theme, this.model);
    }
    getLabel(): string {
        return this.label;
    }

    getIdent(): number {
        return this.tileId;
    }

    getView(): TileComponent {
        return this.view;
    }

    getSourceInfoComponent(): SourceInfoComponent | null {
        return null;
    }

    supportsQueryType(qt: QueryType, translatLang?: string): boolean {
        return qt === 'cmp' || qt === 'single';
    }

    supportsLemmatizationLevel(ll: LemmatizationLevel): boolean {
        return ll === 'lemma';
    }

    disable(): void {}

    getWidthFract(): number {
        return this.widthFract;
    }

    supportsTweakMode(): boolean {
        return true;
    }

    supportsAltView(): boolean {
        return true;
    }

    supportsSVGFigureSave(): boolean {
        return true;
    }

    registerReloadModel(model: ITileReloader): boolean {
        model.registerModel(this, this.model);
        return true;
    }

    supportsMultiWordQueries(): boolean {
        return false;
    }

    getIssueReportingUrl(): string | null {
        return null;
    }

    getAltViewIcon(): AltViewIconProps {
        return DEFAULT_ALT_VIEW_ICON;
    }

    getReadDataFrom(): number | null {
        return null;
    }

    hideOnNoData(): boolean {
        return false;
    }

    isSubtileContainer(): boolean {
        return true;
    }
}

export const init: TileFactory<GramatikatTileConf> = {
    sanityCheck: (args) => {
        const ans = [];
        // TODO
        return ans;
    },

    create: (args) => new GramatikatTile(args),
};
