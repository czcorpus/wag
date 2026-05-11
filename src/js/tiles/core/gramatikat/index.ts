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

import { LemmatizationLevel, QueryType } from '../../../query/index.js';
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
import { init as viewInit } from './views.js';

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
        queryType,
        lemmatizationLevel,
        dependentTiles,
    }: TileFactoryArgs<GramatikatTileConf>) {
        this.tileId = tileId;
        this.appServices = appServices;
        this.widthFract = widthFract;
        this.model = new GramatikatModel({
            dispatcher,
            initState: {
                backlinks: [],
                corpname: '',
                data: {
                    totalFreq: 0,
                    variants: [],
                },
                error: undefined,
                isBusy,
            },
            tileId,
            appServices,
            queryMatches,
            api: new GramatikatAPI(conf.apiUrl),
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
        return false;
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
}

export const init: TileFactory<GramatikatTileConf> = {
    sanityCheck: (args) => {
        const ans = [];
        // TODO
        return ans;
    },

    create: (args) => new GramatikatTile(args),
};
