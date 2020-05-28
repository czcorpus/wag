const fs = require('fs');
const path = require('path');

const templateFiles = [
    'common.ts',
    'index.ts',
    'messages.json',
    'model.ts',
    'style.less',
    'views.tsx'
];

function createTile(tileArg:string) {
    const tileDir = tileArg[0].toLowerCase() + tileArg.slice(1);
    const tileName = tileArg[0].toUpperCase() + tileArg.slice(1);

    fs.mkdirSync(path.resolve(__dirname, '../src/js/tiles/custom', tileDir));
    templateFiles.forEach(fileName => {
        fs.readFile(
            path.resolve(__dirname, 'template-tile', fileName),
            'utf8',
            (err, data) => {
                if (err) return console.log(err);
                fs.writeFile(
                    path.resolve(__dirname, '../src/js/tiles/custom', tileDir, fileName),
                    data.replace(/__Template__/g, tileName),
                    'utf8',
                    err => {if (err) return console.log(err);}
                );
            }
        );
    });

    console.log(`Tile "${tileName}" created!`);
}


if (process.argv.length === 3) {
    createTile(process.argv[2]);

} else if (process.argv.length === 2) {
    let readline = require('readline');
    let rl = readline.createInterface({
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
