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
import { GroupLayoutConfig, LayoutsConfig, LayoutConfigCommon, MainPosAttrValues } from '../conf/index.js';
import { TileIdentMap } from '../types.js';
import { List, Dict, pipe } from 'cnc-tskit';


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


interface LayoutOfQueryTypeSingle extends LayoutCore {}


interface LayoutOfQueryTypeCmp extends LayoutCore {}


interface LayoutOfQueryTypeTranslat extends LayoutCore {
    translatTargetLanguages:Array<string>;
}

function concatLayouts(...layouts:Array<LayoutCore>):Array<TileGroup> {
    return List.flatMap(t => t, layouts.map(t => t.groups));
}

function layoutIsEmpty(layout:LayoutCore):boolean {
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

    private readonly layoutSingle:LayoutOfQueryTypeSingle;

    private readonly layoutCmp:LayoutOfQueryTypeCmp;

    private readonly layoutTranslat:LayoutOfQueryTypeTranslat;

    private readonly queryTypes:Array<QueryTypeMenuItem>;

    private readonly tileMap:TileIdentMap;

    constructor(layouts:LayoutsConfig, tileMap:TileIdentMap, appServices:IAppServices, queryType:QueryType) {
        this.tileMap = tileMap;
        this.layoutSingle = importLayout(
            layouts.single,
            tileMap,
            appServices,
            'global__single_word_sel'
        );
        this.layoutCmp = importLayout(
            layouts.cmp,
            tileMap,
            appServices,
            'global__words_compare'
        );
        this.layoutTranslat = {
            ...importLayout(
                layouts.translat,
                tileMap,
                appServices,
                'global__word_translate'
            ),
            translatTargetLanguages: layouts.translat.targetLanguages || []
        };
        this.validateLayouts(queryType);
        this.queryTypes = [
            {
                type: QueryType.SINGLE_QUERY,
                label: this.layoutSingle.label,
                isEnabled: !layoutIsEmpty(this.layoutSingle)
            },
            {
                type: QueryType.CMP_QUERY,
                label: this.layoutCmp.label,
                isEnabled: !layoutIsEmpty(this.layoutCmp)
            },
            {
                type: QueryType.TRANSLAT_QUERY,
                label: this.layoutTranslat.label,
                isEnabled: !layoutIsEmpty(this.layoutTranslat)
            }
        ];
    }

    /**
     * Return a list of information about invalid items.
     */
    private validateLayouts(queryType:QueryType):void {
        pipe(
            (():LayoutCore => {
                switch (queryType) {
                    case QueryType.CMP_QUERY:
                        return this.layoutCmp;
                    case QueryType.SINGLE_QUERY:
                        return this.layoutSingle;
                    case QueryType.TRANSLAT_QUERY:
                        return this.layoutTranslat;
                    default:
                        throw new Error('unknown query type: ', queryType);
                }
            })().groups,
            List.flatMap(v => v.tiles.map((v2, idx) => ({group: v.groupLabel, tileId: v2.tileId, idx: idx}))),
            List.filter(v => v.tileId === undefined),
            List.forEach((item) => {
                console.error(`Invalid layout configuration for group ${item.group} at position ${item.idx}`);
            })
        );
    }

    getLayoutGroups(queryType:QueryType):Array<TileGroup> {
        return this.getLayout(queryType).groups;
    }

    getLayoutMainPosAttr(queryType:QueryType):MainPosAttrValues {
        return this.getLayout(queryType).mainPosAttr;
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

    getTranslatLanguages():{[k in QueryType]:Array<string>} {
        return Dict.fromEntries([
            [QueryType.SINGLE_QUERY, []],
            [QueryType.CMP_QUERY, []],
            [QueryType.TRANSLAT_QUERY, this.layoutTranslat.translatTargetLanguages]
        ]);
    }

    getLayoutTileConf(queryType:QueryType, tileId:number):GroupedTileProps|null {
        const srch = pipe(
            this.getLayout(queryType).groups,
            List.flatMap(v => v.tiles),
            List.find(v => v.tileId === tileId)
        );
        return srch ? srch : null;
    }

    getDependentTiles(queryType:QueryType, tileId:number):Array<number> {
        return pipe(
            this.getLayout(queryType).groups,
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
    isInCurrentLayout(queryType:QueryType, tileId:number|string):boolean {
        const tTileId = typeof tileId === 'string' ? this.getTileNumber(tileId) : tileId;
        return pipe(
            this.getLayout(queryType).groups,
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

    isEmpty(queryType:QueryType):boolean {
        return pipe(
            this.getLayout(queryType).groups,
            List.flatMap(v => v.tiles),
            List.empty()
        );
    }
}
