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
import { DomainLayoutsConfig, DomainAnyTileConf, GroupItemConfig, TileDbConf, LayoutsConfig, LayoutConfigCommon } from './index';
import { TileConf } from '../page/tile';
import { Observable, of as rxOf } from 'rxjs';
import { reduce, mergeMap } from 'rxjs/operators';


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


export function loadRemoteTileConf(layout:DomainLayoutsConfig, tileDBConf:TileDbConf|undefined):Observable<DomainAnyTileConf> {
    const tiles = pipe(
        layout,
        Dict.toEntries(),
        List.flatMap(
            ([domain, conf]) => {
                const configs:Array<GroupItemConfig> = [].concat(
                    conf.cmp ? conf.cmp.groups : [],
                    conf.single ? conf.single.groups : [],
                    conf.translat ? conf.translat.groups : []);
                return List.map<GroupItemConfig, [string, GroupItemConfig]>(v => [domain, v], configs);
            }
        ),
        List.flatMap<[string, GroupItemConfig], [string, string]>(
            ([domain, group]) => {
                if (typeof group === 'string') {
                    return [[domain, group]];
                }
                return List.map(v => [domain, v.tile], group.tiles)
            }
        )
    );
    console.info(`Loading tile configuration from ${tileDBConf.server}/${tileDBConf.db}`);
    return rxOf(...List.map<[string, string], Observable<[string, StoredTileConf]>>(
        ([domain, tile]) => new Observable<[string, StoredTileConf]>((observer) => {
            axios.get<StoredTileConf>(
                `${tileDBConf.server}/${tileDBConf.db}/${tileDBConf.prefix ? tileDBConf.prefix + ':' : ''}${domain}:${tile}`,
                {
                    auth: {
                        username: tileDBConf.username,
                        password: tileDBConf.password
                    }
                }
            ).then(
                (resp) => {
                    observer.next([domain, resp.data]);
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
            (tilesConf, [domain, data]) => {
                if (!Dict.hasKey(domain, tilesConf)) {
                    tilesConf[domain] = {};
                }
                tilesConf[domain][data.ident] = data.conf;

                return tilesConf;
            },
            {} as DomainAnyTileConf
        )
    );


}


export function useCommonLayouts(layouts:DomainLayoutsConfig):DomainLayoutsConfig {
    return Dict.map((queryTypes, domain) =>
        Dict.map<LayoutConfigCommon, LayoutConfigCommon, string>((layout, queryType) =>
            {
                // if referenced layout, copy its groups
                if (layout.useLayout) {
                    const [d, qt] = layout.useLayout.split('.'); // get domain and query type
                    layout.groups = JSON.parse(JSON.stringify(layouts[d][qt].groups)); // deep copy

                    layout.groups = List.map(group => {
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
                    }, layout.groups);
                }

                return layout;
            },
            queryTypes as {[l:string]:LayoutConfigCommon}
        ) as LayoutsConfig,
        layouts
    ) as DomainLayoutsConfig;
}
