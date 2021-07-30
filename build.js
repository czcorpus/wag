(function (module) {

const path = require('path');
const fs = require('fs');
const merge = require('merge');

function findAllMessageFiles(startDir) {
    let ans = [];
    fs.readdirSync(startDir).forEach((item) => {
        let fullPath = startDir + '/' + item;
        if (fs.lstatSync(fullPath).isDirectory() && ['min'].indexOf(item) === -1) {
            ans = ans.concat(findAllMessageFiles(fullPath));

        } else if (item.match(/messages(\.[a-zA-Z]{1,8})?\.json/)) {
            ans.push(fullPath);
        }
    });
    return ans;
}

function mergeTranslations(startDir, destFile, configuredLangs) {
    let files = findAllMessageFiles(startDir);
    let translations = {};
    files.forEach((item) => {
        const data = JSON.parse(fs.readFileSync(item));
        validateLanguageCodes(Object.keys(data));
        Object.keys(data).forEach(avail => {
            if (configuredLangs.indexOf(avail) === -1) {
                delete data[avail];
            }
        })
        translations = merge.recursive(translations, data);
    });
    if (!destFile || destFile.length === 0) {
        throw new Error('No target file for client-side translations specified');

    } else if (!Array.isArray(destFile)) {
        destFile = [destFile];
    }
    destFile.forEach((destItem) => {
        fs.writeFileSync(destItem, "module.exports = " + JSON.stringify(translations) + ";\n");
        const loadconf = (path) => {
            false
        }
    });
}

function loadModulePathMap(conf, srcPath, distPath) {
    const langs = Object.keys(conf['languages']);
    console.info(conf)
    console.info('langs: ', langs);
    mergeTranslations(srcPath, path.resolve(distPath, '.compiled/translations.js'), langs);
    const moduleMap = {
        'translations': path.resolve(distPath, '.compiled/translations')
    };
    return moduleMap;
}

function validateLanguageCodes(codeList) {
    codeList.forEach((item, i) => {
        if (item.match(/^[a-z]{1,8}_[A-Za-z0-9]{1,8}$/)) {
            console.log('\x1b[31m', `WARNING: Invalid language format - please use ${item.replace('_', '-')} instead of ${item}`, '\x1b[0m');
            codeList[i] = item.replace('_','-');
            console.log('  (auto-fixed)', '\n');
        }
    })
}

module.exports.ProcTranslationsPlugin = class ProcTranslationsPlugin {

    constructor(srcPath, distPath, conf) {
        this._srcPath = srcPath;
        this._distPath = distPath;
        this._conf = conf
    }

    apply(compiler) {
        compiler.hooks.afterPlugins.tap('ProcTranslationsPlugin', (compilation) => {
            const tmpJsDir = path.resolve(this._distPath, '.compiled');
            if (fs.existsSync(tmpJsDir)) {
                fs.readdirSync(tmpJsDir).forEach(item => {
                    try {
                        fs.unlinkSync(path.resolve(tmpJsDir, item));

                    } catch (err) {
                        console.log('Ingored error: ', err);
                    }
                });
                fs.rmdirSync(tmpJsDir);
            }
            fs.mkdirSync(tmpJsDir);

            compiler.options.resolve.alias = loadModulePathMap(this._conf, this._srcPath, this._distPath);
            console.log("\x1b[44m", 'Defined aliases:', "\x1b[0m");
            Object.keys(compiler.options.resolve.alias).forEach(item => {
                console.log("\x1b[32m", item, "\x1b[0m", '\u21D2', compiler.options.resolve.alias[item]);
            });
        });
    }
}


module.exports.loadConf = (path) => {
    return JSON.parse(fs.readFileSync(path));
};


module.exports.createBabelOptions = (env) => {
    return {
        presets: [
            ["@babel/env", { modules: false }],
            "@babel/react",
            "@babel/typescript"
        ],
        plugins: [
            [
                "babel-plugin-styled-components",
                {
                    ssr: true,
                    displayNames: env === 'development'
                }
            ],
            "@babel/proposal-class-properties",
            "@babel/proposal-object-rest-spread",
            "@babel/plugin-syntax-dynamic-import",
            "babel-plugin-dynamic-import-webpack"
        ]
    };
};

})(module);
