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
import * as Immutable from 'immutable';

import { AppServices } from './appServices';
import { QueryType, QueryTypeMenuItem } from './common/query';
import { GroupLayoutConfig, LayoutsConfig } from './conf';
import { string } from 'prop-types';
import { TileIdentMap } from './common/types';


function itemIsGroupConf(v:string|GroupLayoutConfig):v is GroupLayoutConfig {
    return typeof v === 'object' && v['groupLabel'] !== undefined;
}

function itemIsServiceConf(v:string|GroupLayoutConfig):v is string {
    return typeof v === 'string';
}


export interface TileGroup {
    groupLabel:string;
    groupDescURL:string;
    tiles:Immutable.List<{width:number; tileId:number}>;
}


export class LayoutManager {

    private readonly singleQueryLayout:Immutable.List<TileGroup>;

    private readonly singleQueryService:Immutable.List<number>;

    private readonly cmpQueryLayout:Immutable.List<TileGroup>;

    private readonly cmpQueryService:Immutable.List<number>;

    private readonly translatQueryLayout:Immutable.List<TileGroup>;

    private readonly translatQueryService:Immutable.List<number>;

    private readonly queryTypes:Immutable.List<QueryTypeMenuItem>;

    private readonly translatTargetLanguages:Immutable.List<[string, string]>;

    constructor(layouts:LayoutsConfig, tileMap:TileIdentMap, appServices:AppServices) {
        this.singleQueryLayout = Immutable.List<TileGroup>(
                (layouts.single.groups || []).filter(itemIsGroupConf).map<TileGroup>(group => {
                    return {
                        groupLabel: appServices.importExternalMessage(group.groupLabel),
                        groupDescURL: appServices.importExternalMessage(group.groupDescURL),
                        tiles: Immutable.List<{width:number; tileId:number}>(
                                    group.tiles.map(v => ({tileId: tileMap[v.tile], width: v.width})))
                    }
                }));
        this.singleQueryService = Immutable.List<number>(
            (layouts.single.groups || []).filter(itemIsServiceConf).map(v => tileMap[v])
        );

        this.cmpQueryLayout = Immutable.List<TileGroup>(
            (layouts.cmp.groups || []).filter(itemIsGroupConf).map<TileGroup>(group => {
                return {
                    groupLabel: appServices.importExternalMessage(group.groupLabel),
                    groupDescURL: appServices.importExternalMessage(group.groupDescURL),
                    tiles: Immutable.List<{width:number; tileId:number}>(
                                group.tiles.map(v => ({tileId: tileMap[v.tile], width: v.width})))
                }
            }));
        this.cmpQueryService = Immutable.List<number>(
                (layouts.cmp.groups || []).filter(itemIsServiceConf).map(v => tileMap[v])
            );

        this.translatQueryLayout = Immutable.List<TileGroup>(
            (layouts.translat.groups || []).filter(itemIsGroupConf).map<TileGroup>(group => {
                return {
                    groupLabel: appServices.importExternalMessage(group.groupLabel),
                    groupDescURL: appServices.importExternalMessage(group.groupDescURL),
                    tiles: Immutable.List<{width:number; tileId:number}>(
                                group.tiles.map(v => ({tileId: tileMap[v.tile], width: v.width})))
                }
            }));
        this.translatQueryService = Immutable.List<number>(
                (layouts.translat.groups || []).filter(itemIsServiceConf).map(v => tileMap[v])
            );
        this.translatTargetLanguages = Immutable.List<[string, string]>((layouts.translat.targetLanguages || []).map(c => [c, appServices.getLanguageName(c)])).toList();

        const invalid = this.validateLayouts();
        invalid.forEach(item => {
            console.error(`Invalid layout configuration for group ${item.group} at position ${item.idx}`);
        });

        this.queryTypes = Immutable.List<QueryTypeMenuItem>([
            {
                type: QueryType.SINGLE_QUERY,
                label: appServices.translate('global__single_word_sel'),
                isEnabled: this.singleQueryLayout.size > 0
            },
            {
                type: QueryType.CMP_QUERY,
                label: appServices.translate('global__two_words_compare'),
                isEnabled: this.cmpQueryLayout.size > 0
            },
            {
                type: QueryType.TRANSLAT_QUERY,
                label: appServices.translate('global__word_translate'),
                isEnabled: this.translatQueryLayout.size > 0
            }
        ]);
    }

    /**
     * Return a list of information about invalid items.
     */
    private validateLayouts():Immutable.List<{group:string; idx:number, tileId:number|undefined}> {
        return this.singleQueryLayout
            .concat(this.translatQueryLayout)
            .concat(this.cmpQueryLayout)
            .flatMap(v => v.tiles.map((v2, idx) => ({group: v.groupLabel, tileId: v2.tileId, idx: idx})))
            .filter(v => v.tileId === undefined)
            .toList();
    }

    getLayout(queryType:QueryType):Immutable.List<TileGroup> {
        switch (queryType) {
            case QueryType.SINGLE_QUERY:
                return this.singleQueryLayout;
            case QueryType.CMP_QUERY:
                return this.cmpQueryLayout;
            case QueryType.TRANSLAT_QUERY:
                return this.translatQueryLayout;
            default:
                throw new Error(`No layout for ${queryType}`);
        }
    }

    getTargetLanguages():Immutable.Map<QueryType, Immutable.List<[string, string]>> {
        return Immutable.Map<QueryType, Immutable.List<[string, string]>>([
            [QueryType.SINGLE_QUERY, Immutable.List<[string, string]>()],
            [QueryType.CMP_QUERY, Immutable.List<[string, string]>()],
            [QueryType.TRANSLAT_QUERY, this.translatTargetLanguages]
        ]);
    }

    getTileWidthFract(queryType:QueryType, tileId:number):number|null {
        const srch = this.getLayout(queryType).flatMap(v => v.tiles).find(v => v.tileId === tileId);
        return srch ? srch.width : null;
    }

    private isServiceOf(queryType:QueryType, tileId:number):boolean {
        switch (queryType) {
            case QueryType.SINGLE_QUERY:
                return this.singleQueryService.find(v => v === tileId) !== undefined;
            case QueryType.CMP_QUERY:
                return this.cmpQueryService.find(v => v === tileId) !== undefined;
            case QueryType.TRANSLAT_QUERY:
                return this.translatQueryService.find(v => v === tileId) !== undefined;
            default:
                return false;
        }
    }

    isInCurrentLayout(queryType:QueryType, tileId:number):boolean {
        return this.getLayout(queryType).flatMap(v => v.tiles).find(v => v.tileId === tileId) !== undefined ||
            this.isServiceOf(queryType, tileId);
    }



    getQueryTypesMenuItems():Immutable.List<QueryTypeMenuItem> {
        return this.queryTypes;
    }

}