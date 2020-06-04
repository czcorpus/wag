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
import { LanguageLayoutsConfig, LanguageAnyTileConf, GroupItemConfig, TileDbConf } from './index';
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
    lang:string;
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


export function loadRemoteTileConf(layout:LanguageLayoutsConfig, tileDBConf:TileDbConf|undefined):Observable<LanguageAnyTileConf> {
    const tiles = pipe(
        layout,
        Dict.toEntries(),
        List.flatMap(
            ([lang, conf]) => {
                const configs:Array<GroupItemConfig> = [].concat(
                    conf.cmp ? conf.cmp.groups : [],
                    conf.single ? conf.single.groups : [],
                    conf.translat ? conf.translat.groups : []);
                return List.map<GroupItemConfig, [string, GroupItemConfig]>(v => [lang, v], configs);
            }
        ),
        List.flatMap<[string, GroupItemConfig], [string, string]>(
            ([lang, group]) => {
                if (typeof group === 'string') {
                    return [[lang, group]];
                }
                return List.map(v => [lang, v.tile], group.tiles)
            }
        )
    );
    console.info(`Loading tile configuration from ${tileDBConf.server}/${tileDBConf.db}`);
    return rxOf(...List.map<[string, string], Observable<[string, StoredTileConf]>>(
        ([lang, tile]) => new Observable<[string, StoredTileConf]>((observer) => {
            axios.get<StoredTileConf>(
                `${tileDBConf.server}/${tileDBConf.db}/${tileDBConf.prefix ? tileDBConf.prefix + ':' : ''}${lang}:${tile}`,
                {
                    auth: {
                        username: tileDBConf.username,
                        password: tileDBConf.password
                    }
                }
            ).then(
                (resp) => {
                    observer.next([lang, resp.data]);
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
            (tilesConf, [lang, data]) => {
                if (!Dict.hasKey(lang, tilesConf)) {
                    tilesConf[lang] = {};
                }
                tilesConf[lang][data.ident] = data.conf;

                return tilesConf;
            },
            {} as LanguageAnyTileConf
        )
    );


}