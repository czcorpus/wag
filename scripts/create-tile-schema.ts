const fs = require('fs');
const path = require('path');
const tjs = require("typescript-json-schema");


const settings = {
    ignoreErrors: true,
    required: true
};

const compilerOptions = {
    strictNullChecks: true
}

function generateSchema(tileDir:string, typeName:string) {
    const basePath = path.resolve(__dirname, '../src/js/tiles');
    const program = tjs.getProgramFromFiles([path.resolve(basePath, tileDir, 'index.ts')], compilerOptions);
    const schema = tjs.generateSchema(program, typeName, settings);

    fs.writeFile(
        path.resolve(basePath, tileDir, 'config-schema.json'),
        JSON.stringify(schema, undefined, 4),
        'utf8',
        err => {if (err) return console.log(err);}
    );
}


if (process.argv.length === 4) {
    generateSchema(process.argv[2], process.argv[3]);
    console.log(`Config schema ${process.argv[2]} ${process.argv[3]} created!`);

} else if (process.argv.length === 2) {
    const readline = require('readline');
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    rl.question("Enter tile dir (e.g. core/html): ", tileDir => {
        rl.question("Enter config type name (e.g. HtmlTileConf): ", typeName => {
            generateSchema(tileDir, typeName);
            rl.close();
            console.log(`Config schema ${tileDir} ${typeName} created!`);
        });
    });

} else {
    console.error('Expected 2 arguments. Tile directory and config type name in index.ts!');
    process.exit(1);
}

