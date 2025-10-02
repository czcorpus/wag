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
import { TreqSubsetModel } from './model.js';
import { init as viewInit } from './view.js';
import { LocalizedConfMsg } from '../../../types.js';
import { List } from 'cnc-tskit';
import { TreqSubsetsAPI } from './api.js';

export interface PackageGroup {
    label?: LocalizedConfMsg;
    packages: Array<string>;
}

export interface TreqSubsetsTileConf extends TileConf {
    srchPackages: { [lang: string]: Array<PackageGroup> };
    primaryPackage: string;
    apiURL: string;
    minItemFreq?: number;
}

export class TreqSubsetsTile implements ITileProvider {
    private readonly tileId: number;

    private readonly widthFract: number;

    private readonly model: TreqSubsetModel;

    private readonly view: TileComponent;

    private readonly label: string;

    private readonly readDataFromTile: number;

    private static readonly DEFAULT_MIN_ITEM_FREQ = 1;

    constructor({
        tileId,
        dispatcher,
        appServices,
        theme,
        ut,
        widthFract,
        readDataFromTile,
        queryMatches,
        conf,
        isBusy,
        translatLanguage,
    }: TileFactoryArgs<TreqSubsetsTileConf>) {
        this.tileId = tileId;
        this.widthFract = widthFract;
        this.readDataFromTile = readDataFromTile;
        this.model = new TreqSubsetModel({
            dispatcher,
            appServices,
            initialState: {
                lang1: conf.primaryPackage,
                lang2: translatLanguage,
                isBusy: isBusy,
                isAltViewMode: false,
                error: null,
                subsets: List.map(
                    (v) => ({
                        ident: v.packages.join('|'),
                        label: v.label
                            ? appServices.importExternalMessage(v.label)
                            : v.packages.join(', '),
                        translations: [],
                        packages: [...v.packages],
                        isPending: false,
                    }),
                    conf.srchPackages[translatLanguage] || []
                ),
                highlightedRowIdx: -1,
                maxNumLines: 12,
                colorMap: {},
                minItemFreq:
                    conf.minItemFreq || TreqSubsetsTile.DEFAULT_MIN_ITEM_FREQ,
                backlinkConf: conf.backlink,
                backlinks: List.map(
                    (_) => null,
                    conf.srchPackages[translatLanguage] || []
                ),
            },
            tileId,
            api: new TreqSubsetsAPI(conf.apiURL, appServices, conf.backlink),
            queryMatches,
            getColorsFromTile: readDataFromTile,
        });
        this.label = appServices.importExternalMessage(
            conf.label || 'treqsubsets__main_label'
        );
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

    getSourceInfoComponent(): null {
        return null;
    }

    /**
     */
    supportsQueryType(qt: QueryType, translatLanguage?: string): boolean {
        return qt === QueryType.TRANSLAT_QUERY;
    }

    disable(): void {
        this.model.waitForAction({}, (_, sd) => sd);
    }

    getWidthFract(): number {
        return this.widthFract;
    }

    supportsTweakMode(): boolean {
        return false;
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
        return true;
    }

    getIssueReportingUrl(): null {
        return null;
    }

    getReadDataFrom(): number | null {
        return this.readDataFromTile;
    }

    hideOnNoData(): boolean {
        return false;
    }
}

export const init: TileFactory<TreqSubsetsTileConf> = {
    sanityCheck: (args) => [],

    create: (args) => new TreqSubsetsTile(args),
};
