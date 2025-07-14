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
import { IAppServices } from '../appServices.js';
import { QueryType, QueryTypeMenuItem } from '../query/index.js';
import { GroupLayoutConfig, LayoutsConfig, LayoutConfigCommon, MainPosAttrValues, TranslatLanguage } from '../conf/index.js';
import { TileIdentMap } from '../types.js';
import { List, pipe } from 'cnc-tskit';


function itemIsGroupConf(v:string|GroupLayoutConfig):v is GroupLayoutConfig {
    return typeof v === 'object' && v['tiles'] !== undefined;
}

export interface GroupedTileProps {
    width:number;
    tileId:number;
    readDataFrom:string|undefined;
}

export interface TileGroup {
    groupLabel?:string;
    groupDescURL?:string;
    tiles:Array<GroupedTileProps>;
}


interface LayoutCore {
    mainPosAttr:MainPosAttrValues;
    label:string;
    groups:Array<TileGroup>;
}

interface LayoutOfQueryTypeTranslat extends LayoutCore {
    targetLanguages:Array<TranslatLanguage>;
}

function layoutIsLayoutOfQueryTypeTranslat(t:LayoutCore):t is LayoutOfQueryTypeTranslat {
    return t['targetLanguages'] !== undefined;
}


function layoutIsEmpty(layout:LayoutConfigCommon):boolean {
    return layout.groups.length === 0;
}

function importLayout(gc:LayoutConfigCommon|undefined, tileMap:TileIdentMap,
            appServices:IAppServices, defaultLabel:string):LayoutCore {
    return gc !== undefined ?
        {
            mainPosAttr: gc.mainPosAttr,
            label: appServices.importExternalMessage(gc.label?? defaultLabel),
            groups: pipe(
                    gc.groups || [],
                    List.map(group => {
                        if (itemIsGroupConf(group)) {
                            const descUrl = group.groupDescURL || {};
                            return {
                                groupLabel: appServices.importExternalMessage(group.groupLabel),
                                groupDescURL: appServices.externalMessageIsDefined(descUrl) ?
                                    appServices.importExternalMessage(descUrl) :
                                    null,
                                tiles: List.map(
                                    v => ({
                                        tileId: tileMap[v.tile],
                                        width: v.width,
                                        readDataFrom: v.readDataFrom || null
                                    }),
                                    group.tiles
                                )
                            };
                        }
                        return null;
                    }),
                    List.filter(v =>  v !== null)
            )
        } :
        {
            mainPosAttr: 'pos',
            label: '',
            groups: []
        };
}


export class LayoutManager {

    private readonly layout:LayoutCore;

    private readonly queryTypes:Array<QueryTypeMenuItem>;

    private readonly tileMap:TileIdentMap;

    constructor(layouts:LayoutsConfig, tileMap:TileIdentMap, appServices:IAppServices, queryType:QueryType) {
        this.tileMap = tileMap;
        if (queryType === QueryType.SINGLE_QUERY) {
            this.layout = importLayout(
                layouts.single,
                tileMap,
                appServices,
                'global__single_word_sel'
            );

        } else if (queryType === QueryType.CMP_QUERY) {
            this.layout = importLayout(
                layouts.cmp,
                tileMap,
                appServices,
                'global__words_compare'
            );

        } else if (queryType === QueryType.TRANSLAT_QUERY) {
            this.layout = {
                ...importLayout(
                    layouts.translat,
                    tileMap,
                    appServices,
                    'global__word_translate'
                ),
                targetLanguages: layouts.translat.targetLanguages || []
            } as LayoutOfQueryTypeTranslat;

        } else if (queryType === QueryType.PREVIEW) {
            this.layout = {
                ...importLayout(
                    layouts.preview,
                    tileMap,
                    appServices,
                    'global__preview_layout'
                ),
                targetLanguages: layouts.preview.targetLanguages || []
            } as LayoutOfQueryTypeTranslat
        };

        this.validateLayout();
        this.queryTypes = queryType === QueryType.PREVIEW ? [] : [
            {
                type: QueryType.SINGLE_QUERY,
                label: layouts.single?.label ?
                    appServices.importExternalMessage(layouts.single?.label) :
                    appServices.translate('global__single_word_sel'),
                isEnabled: !layoutIsEmpty(layouts.single)
            },
            {
                type: QueryType.CMP_QUERY,
                label: layouts.cmp?.label ?
                    appServices.importExternalMessage(layouts.cmp?.label) :
                    appServices.translate('global__words_compare'),
                isEnabled: !layoutIsEmpty(layouts.cmp)
            },
            {
                type: QueryType.TRANSLAT_QUERY,
                label: layouts.translat?.label ?
                    appServices.importExternalMessage(layouts.translat?.label) :
                     appServices.translate('global__word_translate'),
                isEnabled: !layoutIsEmpty(layouts.translat)
            }
        ];
    }

    /**
     * Return a list of information about invalid items.
     */
    private validateLayout():void {
        pipe(
            this.layout.groups,
            List.flatMap(v => v.tiles.map((v2, idx) => ({group: v.groupLabel, tileId: v2.tileId, idx: idx}))),
            List.filter(v => v.tileId === undefined),
            List.forEach((item) => {
                console.error(`Invalid layout configuration for group ${item.group} at position ${item.idx}`);
            })
        );
    }

    getLayoutGroups():Array<TileGroup> {
        return this.getLayout().groups;
    }

    getLayoutMainPosAttr():MainPosAttrValues {
        return this.getLayout().mainPosAttr;
    }

    private getLayout():LayoutCore {
        return this.layout;
    }

    getTranslatLanguages():Array<TranslatLanguage> {
        if (layoutIsLayoutOfQueryTypeTranslat(this.layout)) {
            return this.layout.targetLanguages;
        }
        return [];
    }

    getLayoutTileConf(tileId:number):GroupedTileProps|null {
        const srch = pipe(
            this.getLayout().groups,
            List.flatMap(v => v.tiles),
            List.find(v => v.tileId === tileId)
        );
        return srch ? srch : null;
    }

    getDependentTiles(tileId:number):Array<number> {
        return pipe(
            this.getLayout().groups,
            List.flatMap(v => v.tiles),
            List.filter(v => {
                const srchId = this.getTileNumber(v.readDataFrom);
                return srchId === tileId;
            }),
            List.map(
                v => v.tileId
            )
        );
    }

    /**
     * Test whether provided tile (identified either by its numeric ID or its string identifier)
     * belongs to the current layout. Service tiles are examined too.
     */
    isInCurrentLayout(tileId:number|string):boolean {
        const tTileId = typeof tileId === 'string' ? this.getTileNumber(tileId) : tileId;
        return pipe(
            this.getLayout().groups,
            List.flatMap(v => v.tiles),
            List.some(v => v.tileId === tTileId)
        );
    }

    getQueryTypesMenuItems():Array<QueryTypeMenuItem> {
        return this.queryTypes;
    }

    getTileNumber(tileId:string):number {
        return this.tileMap[tileId];
    }

    isEmpty():boolean {
        return pipe(
            this.getLayout().groups,
            List.flatMap(v => v.tiles),
            List.empty()
        );
    }
}
