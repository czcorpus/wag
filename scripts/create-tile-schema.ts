import fs from 'fs';
import path from 'path';
import tjs from 'typescript-json-schema';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const settings = {
    ignoreErrors: true,
    required: true,
};

const compilerOptions = {
    strictNullChecks: true,
};

function generateSchema(tileDir: string, typeName: string) {
    const basePath = path.resolve(__dirname, '../src/js/tiles');
    const program = tjs.getProgramFromFiles(
        [path.resolve(basePath, tileDir, 'index.ts')],
        compilerOptions
    );
    const schema = tjs.generateSchema(program, typeName, settings);

    fs.writeFileSync(
        path.resolve(basePath, tileDir, 'config-schema.json'),
        JSON.stringify(schema, undefined, 4),
        'utf8'
    );
}

if (process.argv.length === 4) {
    generateSchema(process.argv[2], process.argv[3]);
    console.log(`Config schema ${process.argv[2]} ${process.argv[3]} created!`);
} else if (process.argv.length === 2) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    rl.question('Enter tile dir (e.g. core/html): ', (tileDir) => {
        const tileName = tileDir.split('/')[1];
        const defaultTileConf =
            tileName[0].toUpperCase() + tileName.slice(1) + 'TileConf';
        rl.question(
            `Enter config type name (e.g. HtmlTileConf, default ${defaultTileConf}): `,
            (typeName) => {
                generateSchema(tileDir, typeName || defaultTileConf);
                rl.close();
                console.log(
                    `Config schema ${tileDir} ${typeName || defaultTileConf} created!`
                );
            }
        );
    });
} else {
    console.error(
        'Expected 2 arguments. Tile directory and config type name in index.ts!'
    );
    process.exit(1);
}
