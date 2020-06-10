var fs = require('fs');
var path = require('path');
var tileConf = require('./create-tile-conf');

const templateFiles = [
    'common.ts',
    'index.ts',
    'messages.json',
    'model.ts',
    'style.less',
    'views.tsx',
    'config-schema.json'
];

function createTile(tileArg:string) {
    const tileDir = tileArg[0].toLowerCase() + tileArg.slice(1);
    const tileName = tileArg[0].toUpperCase() + tileArg.slice(1);

    fs.mkdirSync(path.resolve(__dirname, '../src/js/tiles/custom', tileDir));
    templateFiles.forEach((fileName, index) => {
        const data = fs.readFileSync(
            path.resolve(__dirname, '../src/js/tiles/custom/template', fileName),
            'utf8'
        );

        fs.writeFileSync(
            path.resolve(__dirname, '../src/js/tiles/custom', tileDir, fileName),
            data.replace(/__Template__/g, tileName),
            'utf8'
        );
        
        if (index === templateFiles.length - 1) {
            console.log(`Tile "${tileName}" created!`);
            console.log('Empty JSON config: ');
            console.log(tileConf.getEmptyConfig(path.resolve(__dirname, '../src/js/tiles/custom', tileDir, 'config-schema.json')));
        }
    });
}


if (process.argv.length === 3) {
    createTile(process.argv[2]);

} else if (process.argv.length === 2) {
    const readline = require('readline');
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    rl.question("Enter tile name: ", answer => {
        createTile(answer);
        rl.close();
    });

} else {
    console.error('Expected one tile name argument!');
    process.exit(1);
}
