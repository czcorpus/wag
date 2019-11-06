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
import { List, Map } from 'immutable';
import { AppServices } from './appServices';
import { QueryType, QueryTypeMenuItem } from './common/query';
import { GroupLayoutConfig, LayoutsConfig, LayoutConfigCommon } from './conf';
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
    tiles:List<{width:number; tileId:number}>;
}


interface LayoutCore {
    groups:List<TileGroup>;
    services:List<number>;
    supportsMultiWordQuery:boolean;
}


interface LayoutOfQueryTypeSingle extends LayoutCore {}


interface LayoutOfQueryTypeCmp extends LayoutCore {}


interface LayoutOfQueryTypeTranslat extends LayoutCore {
    translatTargetLanguages:List<[string, string]>;
}


function concatLayouts(...layouts:Array<LayoutCore>):List<TileGroup> {
    return layouts.map(t => t.groups).reduce((acc, curr) => acc.concat(curr).toList(), List<TileGroup>());
}

function layoutIsEmpty(layout:LayoutCore):boolean {
    return layout.groups.size === 0;
}


function importLayout(gc:LayoutConfigCommon|undefined, tileMap:TileIdentMap,
            appServices:AppServices):LayoutCore {
    return gc !== undefined ?
        {
            groups: List<TileGroup>(
                (gc.groups || []).filter(itemIsGroupConf).map<TileGroup>(group => ({
                    groupLabel: appServices.importExternalMessage(group.groupLabel),
                    groupDescURL: appServices.importExternalMessage(group.groupDescURL || {}),
                    tiles: List<{width:number; tileId:number}>(
                                group.tiles.map(v => ({tileId: tileMap[v.tile], width: v.width})))
                }))),
            services: List<number>(
                (gc.groups || []).filter(itemIsServiceConf).map(v => tileMap[v])),
            supportsMultiWordQuery: !!gc.allowMultiWordQuery
        } :
        {
            groups: List<TileGroup>(),
            services: List<number>(),
            supportsMultiWordQuery: false
        };
}


export class LayoutManager {

    private readonly layoutSingle:LayoutOfQueryTypeSingle;

    private readonly layoutCmp:LayoutOfQueryTypeCmp;

    private readonly layoutTranslat:LayoutOfQueryTypeTranslat;

    private readonly queryTypes:List<QueryTypeMenuItem>;

    constructor(layouts:LayoutsConfig, tileMap:TileIdentMap, appServices:AppServices) {

        this.layoutSingle = importLayout(layouts.single, tileMap, appServices);
        this.layoutCmp = importLayout(layouts.cmp, tileMap, appServices);
        this.layoutTranslat = {
            ...importLayout(layouts.translat, tileMap, appServices),
            translatTargetLanguages: List<[string, string]>(
                (layouts.translat ? layouts.translat.targetLanguages : []).map(c => [c, appServices.getLanguageName(c)])).toList()
        };
        this.validateLayouts();
        this.queryTypes = List<QueryTypeMenuItem>([
            {
                type: QueryType.SINGLE_QUERY,
                label: appServices.translate('global__single_word_sel'),
                isEnabled: !layoutIsEmpty(this.layoutSingle)
            },
            {
                type: QueryType.CMP_QUERY,
                label: appServices.translate('global__two_words_compare'),
                isEnabled: !layoutIsEmpty(this.layoutCmp)
            },
            {
                type: QueryType.TRANSLAT_QUERY,
                label: appServices.translate('global__word_translate'),
                isEnabled: !layoutIsEmpty(this.layoutTranslat)
            }
        ]);
    }

    /**
     * Return a list of information about invalid items.
     */
    private validateLayouts():void {
        concatLayouts(this.layoutSingle, this.layoutCmp, this.layoutTranslat)
            .flatMap(v => v.tiles.map((v2, idx) => ({group: v.groupLabel, tileId: v2.tileId, idx: idx})))
            .filter(v => v.tileId === undefined)
            .forEach(item => {
                console.error(`Invalid layout configuration for group ${item.group} at position ${item.idx}`);
            });
    }

    getLayoutGroups(queryType:QueryType):List<TileGroup> {
        return this.getLayout(queryType).groups;
    }

    private getLayout(queryType:QueryType):LayoutCore {
        switch (queryType) {
            case QueryType.SINGLE_QUERY:
                return this.layoutSingle;
            case QueryType.CMP_QUERY:
                return this.layoutCmp;
            case QueryType.TRANSLAT_QUERY:
                return this.layoutTranslat;
            default:
                throw new Error(`No layout for ${queryType}`);
        }
    }

    getTargetLanguages():Map<QueryType, List<[string, string]>> {
        return Map<QueryType, List<[string, string]>>([
            [QueryType.SINGLE_QUERY, List<[string, string]>()],
            [QueryType.CMP_QUERY, List<[string, string]>()],
            [QueryType.TRANSLAT_QUERY, this.layoutTranslat.translatTargetLanguages]
        ]);
    }

    getTileWidthFract(queryType:QueryType, tileId:number):number|null {
        const srch = this.getLayout(queryType).groups.flatMap(v => v.tiles).find(v => v.tileId === tileId);
        return srch ? srch.width : null;
    }

    getMultiWordQuerySupport():Map<QueryType, boolean> {
        return Map([
            [QueryType.SINGLE_QUERY, this.getLayout(QueryType.SINGLE_QUERY).supportsMultiWordQuery],
            [QueryType.CMP_QUERY, this.getLayout(QueryType.CMP_QUERY).supportsMultiWordQuery],
            [QueryType.TRANSLAT_QUERY, this.getLayout(QueryType.TRANSLAT_QUERY).supportsMultiWordQuery]
        ])
    }

    private isServiceOf(queryType:QueryType, tileId:number):boolean {
        return this.getLayout(queryType).services.find(v => v === tileId) !== undefined;
    }

    isInCurrentLayout(queryType:QueryType, tileId:number):boolean {
        return this.getLayout(queryType).groups.flatMap(v => v.tiles).find(v => v.tileId === tileId) !== undefined ||
            this.isServiceOf(queryType, tileId);
    }

    getQueryTypesMenuItems():List<QueryTypeMenuItem> {
        return this.queryTypes;
    }
}
