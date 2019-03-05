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
import { QueryType } from './common/types';

export interface LayoutItemConf {
    width:number;
    tile:string;
}

export type LayoutConf = Array<{
    groupLabel:string;
    groupDesc:string;
    tiles:Array<LayoutItemConf>
}>;

export interface TileGroup {
    groupLabel:string;
    groupDesc:string;
    groupTemplate?:string;
    tiles:Immutable.List<{width:number; tileId:number}>;
}



export class LayoutManager {

    private singleQueryLayout:Immutable.List<TileGroup>;

    private cmpQueryLayout:Immutable.List<TileGroup>;

    private translatQueryLayout:Immutable.List<TileGroup>;

    constructor(layouts:{[qt:string]:LayoutConf}, tileMap:{[ident:string]:number}, appServices:AppServices) {

        this.singleQueryLayout = Immutable.List<TileGroup>(
                (layouts[QueryType.SINGLE_QUERY] || []).map<TileGroup>(group => {
                    return {
                        groupLabel: appServices.importExternalMessage(group.groupLabel),
                        groupDesc: appServices.importExternalMessage(group.groupDesc),
                        tiles: Immutable.List<{width:number; tileId:number}>(
                                    group.tiles.map(v => ({tileId: tileMap[v.tile], width: v.width})))
                    }
                }));
        this.cmpQueryLayout = Immutable.List<TileGroup>(
            (layouts[QueryType.CMP_QUERY] || []).map<TileGroup>(group => {
                return {
                    groupLabel: appServices.importExternalMessage(group.groupLabel),
                    groupDesc: appServices.importExternalMessage(group.groupDesc),
                    tiles: Immutable.List<{width:number; tileId:number}>(
                                group.tiles.map(v => ({tileId: tileMap[v.tile], width: v.width})))
                }
            }));
        this.translatQueryLayout = Immutable.List<TileGroup>(
            (layouts[QueryType.TRANSLAT_QUERY] || []).map<TileGroup>(group => {
                return {
                    groupLabel: appServices.importExternalMessage(group.groupLabel),
                    groupDesc: appServices.importExternalMessage(group.groupDesc),
                    tiles: Immutable.List<{width:number; tileId:number}>(
                                group.tiles.map(v => ({tileId: tileMap[v.tile], width: v.width})))
                }
            }));
        const invalid = this.validateLayouts();
        invalid.forEach(item => {
            console.error(`Invalid layout configuration for group ${item.group} at position ${item.idx}`);
        });
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

    getTileWidthFract(queryType:QueryType, tileId:number):number|null {
        const srch = this.getLayout(queryType).flatMap(v => v.tiles).find(v => v.tileId === tileId);
        return srch ? srch.width : null;
    }

    isInCurrentLayout(queryType:QueryType, tileId:number):boolean {
        return this.getLayout(queryType).flatMap(v => v.tiles).find(v => v.tileId === tileId) !== undefined;
    }

}