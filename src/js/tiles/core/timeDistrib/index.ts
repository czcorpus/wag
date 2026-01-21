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
import { List, Maths } from 'cnc-tskit';

import { QueryType } from '../../../query/index.js';
import {
    AltViewIconProps,
    DEFAULT_ALT_VIEW_ICON,
    ITileProvider,
    ITileReloader,
    TileComponent,
    TileFactory,
    TileFactoryArgs,
} from '../../../page/tile.js';
import { TimeDistTileConf } from './common.js';
import { TimeDistribModel, LoadingStatus } from './model.js';
import { init as singleViewInit } from './views/single.js';
import { init as compareViewInit } from './views/compare.js';
import { MQueryTimeDistribStreamApi } from '../../../api/vendor/mquery/timeDistrib.js';
import { CorpusInfoAPI } from '../../../api/vendor/mquery/corpusInfo.js';
import { validatePosQueryGenerator } from '../../../conf/common.js';

/**
 * Important note: the tile works in two mutually exclusive
 * modes:
 * 1) depending on a concordance tile
 *   - in such case the concordance (subc)corpus must be
 *     the same as the (sub)corpus this tile works with
 *   - the 'waitFor' conf value must be set
 *   - the 'subcname' should have only one value (others are ignored)
 *
 * 2) independent - creating its own concordances, using possibly multiple subcorpora
 *   - the 'waitFor' cannot be present in the config
 *   - the 'subcname' can have any number of items
 *     - the tile queries all the subcorpora and then merges all the data
 *
 */
export class TimeDistTile implements ITileProvider {
    private readonly dispatcher: IActionDispatcher;

    private readonly tileId: number;

    private readonly model: TimeDistribModel;

    private readonly widthFract: number;

    private readonly view: TileComponent;

    private readonly label: string;

    constructor({
        dispatcher,
        tileId,
        ut,
        theme,
        appServices,
        widthFract,
        queryMatches,
        conf,
        isBusy,
        mainPosAttr,
        queryType,
    }: TileFactoryArgs<TimeDistTileConf>) {
        this.dispatcher = dispatcher;
        this.tileId = tileId;
        this.widthFract = widthFract;

        this.model = new TimeDistribModel({
            dispatcher: dispatcher,
            initState: {
                loadingStatus: isBusy
                    ? LoadingStatus.BUSY_LOADING_MAIN
                    : LoadingStatus.IDLE,
                error: null,
                corpname: conf.corpname,
                subcnames: Array.isArray(conf.subcname)
                    ? [...conf.subcname]
                    : [conf.subcname],
                subcDesc: appServices.importExternalMessage(conf.subcDesc),
                mainPosAttr,
                alphaLevel: Maths.AlphaLevel.LEVEL_1, // TODO conf/explain
                data: List.map((_) => [], queryMatches),
                dataCmp: [],
                posQueryGenerator: conf.posQueryGenerator,
                supportsSublemma: conf.supportsSublemma,
                isTweakMode: false,
                useAbsFreq: false,
                displayObserved: conf.showMeasuredFreq || false,
                wordMainLabels: List.map((_) => '', queryMatches),
                wordCmpInput: '',
                wordCmp: '',
                zoom: [null, null],
                refArea: [null, null],
                fromYear: conf.fromYear,
                toYear: conf.toYear,
                maxItems: conf.maxItems,
                fcrit: conf.fcrit,
                mainBacklinks: List.map((_) => null, queryMatches),
                cmpBacklink: null,
                averagingYears: 0,
                units: '%',
            },
            api: new MQueryTimeDistribStreamApi(
                conf.apiURL,
                appServices,
                conf.backlink
            ),
            infoApi: new CorpusInfoAPI(conf.apiURL, appServices),
            tileId,
            appServices,
            queryMatches,
        });
        this.label = appServices.importExternalMessage(
            conf.label || 'timeDistrib__main_label'
        );
        this.view =
            queryType === QueryType.CMP_QUERY ||
            (queryType === QueryType.PREVIEW && queryMatches.length > 1)
                ? compareViewInit(this.dispatcher, ut, theme, this.model)
                : singleViewInit(this.dispatcher, ut, theme, this.model);
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

    getLabel(): string {
        return this.label;
    }

    supportsQueryType(qt: QueryType, translatLang?: string): boolean {
        return (
            qt === QueryType.SINGLE_QUERY ||
            qt === QueryType.CMP_QUERY ||
            qt === QueryType.TRANSLAT_QUERY
        );
    }

    disable(): void {
        this.model.waitForAction({}, (_, sd) => sd);
    }

    getWidthFract(): number {
        return this.widthFract;
    }

    supportsTweakMode(): boolean {
        return true;
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

export const init: TileFactory<TimeDistTileConf> = {
    sanityCheck: (args) => {
        let ans = [];
        if (!args.conf.fcrit) {
            ans.push(
                new Error(
                    `${args.conf.tileType}: missing "fcrit" configuration`
                )
            );
        }
        if (!args.conf.maxItems) {
            ans.push(
                new Error(
                    `${args.conf.tileType}: missing "maxItems" configuration`
                )
            );
        }
        if (!args.conf.posQueryGenerator) {
            ans.push(
                new Error(
                    `${args.conf.tileType}: missing "posQueryGenerator" configuration`
                )
            );
        }
        const message = validatePosQueryGenerator(args.conf.posQueryGenerator);
        if (message) {
            ans.push(
                new Error(
                    `invalid posQueryGenerator in timeDistrib tile, ${message}`
                )
            );
        }
        return ans;
    },

    create: (args) => {
        return new TimeDistTile(args);
    },
};
