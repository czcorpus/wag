/*
 * Copyright 2020 Martin Zimandl <martin.zimandl@gmail.com>
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

import { Dict, List } from 'cnc-tskit';
import * as path from 'path';
import * as ajv from 'ajv';
import * as fs from 'fs';
import { LanguageAnyTileConf, TileDbConf } from '.';


const CORE_TILES_ROOT_DIR = path.resolve(__dirname, '../src/js/tiles/core');

const CUSTOM_TILES_ROOT_DIR = path.resolve(__dirname, '../src/js/tiles/custom');

const SCHEMA_FILENAME = 'config-schema.json';


export function validateTilesConf(tilesConf:LanguageAnyTileConf):boolean {
    const validator = new ajv();
    let validationError = false;

    console.log('Validating tiles configuration...');

    Dict.forEach((tiles, lang) => {
        Dict.forEach((tileConf, tileName) => {
            let configSchema:{};
            const tileType = tileConf.tileType + '';
            const folderName = tileType[0].toLowerCase() + tileType.slice(1).split('Tile')[0];
            const confPath = path.resolve(CORE_TILES_ROOT_DIR, folderName, SCHEMA_FILENAME);
            if (fs.existsSync(confPath)) {
                configSchema = JSON.parse(fs.readFileSync(confPath, 'utf-8'));

            } else {
                const confPath = path.resolve(CUSTOM_TILES_ROOT_DIR, folderName, SCHEMA_FILENAME);
                if (fs.existsSync(confPath)) {
                    configSchema = JSON.parse(fs.readFileSync(confPath, 'utf-8'));
                }
            }
            if (!configSchema) {
                console.log(`  ${lang}/${tileName} [\x1b[31m FAIL \x1b[0m]`);
                console.log('    \u25B6 schema "${tileType}" not found');
                validationError = true;

            } else if (validator.validate(configSchema, tileConf)) {
                console.log(`  ${lang}/${tileName} [\x1b[32m OK \x1b[0m]`);

            } else {
                console.log(`  ${lang}/${tileName} [\x1b[31m FAIL \x1b[0m]`);
                List.forEach(
                    err => {
                        console.log(`    \u25B6 ${err.message}`)
                    },
                    validator.errors
                );
                validationError = true;
            }
        }, tiles);
    }, tilesConf);
    if (validationError) {
        return false;
    }
    console.log('...\uD83D\uDC4D All the tiles are valid');
    return true;
}

export function isTileDBConf(tiles: TileDbConf|LanguageAnyTileConf):tiles is TileDbConf {
    return (tiles as TileDbConf).server !== undefined;
}