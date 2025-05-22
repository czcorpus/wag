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
import { pipe, List, Dict, tuple } from 'cnc-tskit';
import * as path from 'path';
import {
    GroupItemConfig, TileDbConf, LayoutsConfig,
    LayoutConfigCommon,
    AllQueryTypesTileConf
} from './index.js';
import { TileConf } from '../page/tile.js';
import { Observable, of as rxOf } from 'rxjs';
import { reduce, mergeMap } from 'rxjs/operators';
import urlJoin from 'url-join';


/**
 * StoredTileConf describes a JSON record for a tile
 * configuration as stored in a CouchDB instance.
 */
interface StoredTileConf {
    _id:string;
    _rev:string;
    ident:string;
    domain:string;
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


export function loadRemoteTileConf(layout:LayoutsConfig, tileDBConf:TileDbConf|undefined):Observable<AllQueryTypesTileConf> {
    const tiles = pipe(
        layout.cmp.groups,
        List.concat(layout.single.groups),
        List.concat(layout.translat.groups),
        List.map(
            (group) => {
                if (typeof group === 'string') {
                    return group;
                }
                return List.map(v => v.tile, group.tiles);
            }
        )
    );
    console.info(`Loading tile configuration from ${tileDBConf.server}/${tileDBConf.db}`);
    return rxOf(...List.map<string, Observable<StoredTileConf>>(
        (tile) => new Observable<StoredTileConf>((observer) => {
            axios.get<StoredTileConf>(
                urlJoin(tileDBConf.server, tileDBConf.db, `${tileDBConf.prefix ? tileDBConf.prefix + ':' : ''}:${tile}`),
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


export function useCommonLayouts(layouts:LayoutsConfig):LayoutsConfig {
    return Dict.map((queryTypes, domain) =>
        Dict.map<LayoutConfigCommon, LayoutConfigCommon, string>((layout, queryType) =>
            {
                // if referenced layout, copy its groups
                if (layout.useLayout) {
                    const [d, qt] = layout.useLayout.split('.'); // get domain and query type
                    layout.groups = JSON.parse(JSON.stringify(layouts[d][qt].groups)); // deep copy

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
            },
            queryTypes as {[l:string]:LayoutConfigCommon}
        ) as LayoutsConfig,
        layouts
    ) as DomainLayoutsConfig;
}
