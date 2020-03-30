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
import { TileConf } from '../common/tile';


interface StoredTileConf {
    _id:string;
    _rev:string;
    ident:string;
    lang:string;
    conf:TileConf;
}


export function parseJsonConfig<T>(confPath:string):T {
    try {
        console.log(`Loading configuration ${confPath}`);
        return JSON.parse(fs.readFileSync(confPath, 'utf8')) as T;

    } catch (e) {
        throw new Error(`Failed to parse configuration ${path.basename(confPath)}: ${e}`)
    }
}

export async function loadTiles(layout:LanguageLayoutsConfig, tileDBConf:TileDbConf|undefined):Promise<LanguageAnyTileConf> {
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

    const tilesConf:LanguageAnyTileConf = {};
    List.forEach(
        async ([lang, tile]) => {
            const resp = await axios.get<StoredTileConf>(
                `${tileDBConf.server}/${tileDBConf.db}/${tileDBConf.prefix ? tileDBConf.prefix + ':' : ''}${lang}:${tile}`,
                {
                    auth: {
                        username: tileDBConf.username,
                        password: tileDBConf.password
                    }
                }
            );
            if (!Dict.hasKey(lang, tilesConf)) {
                tilesConf[lang] = {};
            }
            tilesConf[lang][tile] = resp.data.conf;
        },
        tiles
    );
    return tilesConf;
}