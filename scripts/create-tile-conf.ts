import fs from 'fs';
import path from 'path';
import * as cnc from 'cnc-tskit';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


export function getEmptyConfig(configSchemaPath:string):string {
    const jsonSchema = JSON.parse(fs.readFileSync(
        configSchemaPath,
        'utf8'
    ));
    
    const emptyConfig = cnc.pipe(
        jsonSchema['properties'],
        cnc.Dict.mapEntries(([k, v]) => ([k, jsonSchema['required'] && jsonSchema['required'].includes(k) ? 'REQUIRED' : null])),
        cnc.Dict.fromEntries()
    );

    return JSON.stringify(emptyConfig, undefined, 4);
}

if (process.argv.length === 3) {
    const emptyConfig = getEmptyConfig(path.resolve(__dirname, '../src/js/tiles', process.argv[2], 'config-schema.json'))

    console.log(`Empty config for ${process.argv[2]} tile`);
    console.log(emptyConfig);

} else if (process.argv.length === 2) {
    const readline = require('readline');
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    rl.question("Enter tile dir (e.g. core/html): ", tileDir => {
        const emptyConfig = getEmptyConfig(path.resolve(__dirname, '../src/js/tiles', tileDir, 'config-schema.json'))
        rl.close();
        console.log(`Empty config for ${tileDir} tile`);
        console.log(emptyConfig);
    });

} else {
    console.error('Expected 1 argument as tile directory.');
    process.exit(1);
}
