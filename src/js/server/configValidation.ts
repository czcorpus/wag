import { Dict } from 'cnc-tskit';
import * as path from 'path';
import * as ajv from 'ajv';
import * as fs from 'fs';
import { LanguageAnyTileConf } from '../conf';

export function validateTilesConf(tilesConf: LanguageAnyTileConf) {
    const validator = new ajv();
    let validationError = false;

    console.log('Validating tiles configuration');
    Dict.forEach((tiles, lang) => {
        Dict.forEach((tileConf, tileName) => {
            const folderName = tileConf.tileType[0].toLowerCase() + tileConf.tileType.slice(1).split('Tile')[0];
            let configSchema;
            if (fs.existsSync(path.resolve(__dirname, `../src/js/tiles/core/${folderName}/config-schema.json`))) {
                configSchema = JSON.parse(fs.readFileSync(
                    path.resolve(__dirname, `../src/js/tiles/core/${folderName}/config-schema.json`),
                    'utf-8'
                ));

            } else if (fs.existsSync(path.resolve(__dirname, `../src/js/tiles/custom/${folderName}/config-schema.json`))) {
                configSchema = JSON.parse(fs.readFileSync(
                    path.resolve(__dirname, `../src/js/tiles/custom/${folderName}/config-schema.json`),
                    'utf-8'
                ));

            } else {
                throw Error(`Tile schema not found: tileType = ${tileConf.tileType}`);
            }

            if (validator.validate(configSchema, tileConf)) {
                console.log('Tile valid: ', lang, tileName);

            } else {
                console.log('Invalid tile config: ', lang, tileName);
                console.log(validator.errors);
                validationError = true;                
            }
        }, tiles);
    }, tilesConf);

    if (validationError) {
        throw Error('Invalid tile config found!');

    } else {
        console.log('All tiles valid');
    }
}