/*
 * Copyright 2020 Tomas Machalek <tomas.machalek@gmail.com>
 * Copyright 2020 Institute of the Czech National Corpus,
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

import * as fs from 'fs';
import axios from 'axios';
import { pipe, List, Dict } from 'cnc-tskit';
import * as path from 'path';
import {
    TileDbConf, LayoutsConfig, LayoutConfigCommon,
    AllQueryTypesTileConf
} from './index.js';
import { TileConf } from '../page/tile.js';
import { Observable, of as rxOf } from 'rxjs';
import { reduce, mergeMap } from 'rxjs/operators';
import urlJoin from 'url-join';


/**
 * StoredTileConf describes a JSON record for a tile
 * configuration as stored in a CouchDB or APIGuard instance.
 */
interface StoredTileConf {
    _id:string;
    _rev:string;
    ident:string;
    conf:TileConf;
}

/**
 * Load a locally stored general JSON file.
 */
export function parseJsonConfig<T>(confPath:string):Observable<T> {
    return new Observable<T>((observer) => {
        try {
            console.info(`Loading configuration ${confPath}`);
            fs.readFile(confPath, 'utf8', (err, data) => {
                if (err) {
                    observer.error(new Error(`Failed to read file ${confPath}: ${err}`));

                } else {
                    observer.next(JSON.parse(data) as T);
                    observer.complete();
                }
            });

        } catch (e) {
            observer.error(new Error(`Failed to parse configuration ${path.basename(confPath)}: ${e}`));
        }
    });
}


/**
 * Load all the required tiles defined in the provided layout.
 * The layout is expected to
 */
export function loadRemoteTileConf(layout:LayoutsConfig, tileDBConf:TileDbConf|undefined):Observable<AllQueryTypesTileConf> {
    const tiles = pipe(
        layout.cmp.groups,
        List.concat(layout.single.groups),
        List.concat(layout.translat.groups),
        List.flatMap(group => group.tiles),
        List.map(t => t.tile)
    );
    console.info(`Loading tile configuration from ${tileDBConf.server}/${tileDBConf.db}`);
    return rxOf(...List.map<string, Observable<StoredTileConf>>(
        (tile) => new Observable<StoredTileConf>((observer) => {
            axios.get<StoredTileConf>(
                urlJoin(tileDBConf.server, tileDBConf.db, `${tileDBConf.prefix ? tileDBConf.prefix + ':' : ''}${tile}`),
                {
                    auth: {
                        username: tileDBConf.username,
                        password: tileDBConf.password
                    }
                }
            ).then(
                (resp) => {
                    observer.next(resp.data);
                    observer.complete();
                },
                (err) => {
                    observer.error(new Error(`Failed to load a configuration for ${tile}: ${err}`));
                }
            );
        }),
        tiles

    )).pipe(
        mergeMap(
            v => v
        ),
        reduce(
            (tilesConf, data) => {
                tilesConf[data.ident] = data.conf;

                return tilesConf;
            },
            {} as AllQueryTypesTileConf
        )
    );
}

/**
 *
 */
function expandLayout<T extends LayoutConfigCommon>(
    layout:T,
    mkEmpty:()=>T,
    layouts:LayoutsConfig
):T {
    if (!layout) {
        return mkEmpty();
    }
    // if referenced layout, copy its groups
    if (layout.useLayout) {
        layout.groups = JSON.parse(JSON.stringify(layouts[layout.useLayout].groups)); // deep copy

        layout.groups = List.map(
            group => {
                if (typeof group !== 'string') {
                    group.tiles = List.reduce((tiles, tile) => {
                        // replace referenced tile
                        if (Dict.hasKey(tile.ref, layout.replace)) {
                            tile.tile = layout.replace[tile.ref];
                        }
                        tiles.push(tile);

                        // add more tiles after referenced one
                        if (Dict.hasKey(tile.ref, layout.insertAfter)) {
                            tiles = tiles.concat(layout.insertAfter[tile.ref]);
                        }

                        return tiles;
                    }, [], group.tiles)
                }
                return group
            },
            layout.groups
        );
    }
    return layout;
}


export function useCommonLayouts(layouts:LayoutsConfig):LayoutsConfig {
    layouts.cmp = expandLayout(
        layouts.cmp, () => ({ groups: [], mainPosAttr: 'pos' }), layouts);
    layouts.single = expandLayout(
        layouts.single, () => ({ groups: [], mainPosAttr: 'pos' }), layouts);
    layouts.translat = expandLayout(
        layouts.translat, () => ({ groups: [], mainPosAttr: 'pos', targetLanguages: [] }), layouts);
    return layouts;
}
