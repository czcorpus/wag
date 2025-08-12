import path from 'path';
import fs from 'fs';
import merge from 'merge';

function findAllMessageFiles(startDir) {
    const ans = [];
    fs.readdirSync(startDir).forEach((item) => {
        let fullPath = startDir + '/' + item;
        if (fs.statSync(fullPath).isDirectory() && ['min'].indexOf(item) === -1) {
            ans.push(...findAllMessageFiles(fullPath));

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
        const data = JSON.parse(fs.readFileSync(item, 'utf-8'));
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
        fs.writeFileSync(destItem, "export default " + JSON.stringify(translations) + ";\n");
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

export class ProcTranslationsPlugin {

    constructor(srcPath, distPath, conf) {
        this._srcPath = srcPath;
        this._distPath = distPath;
        this._conf = conf
    }

    apply(compiler) {
        const tmpJsDir = path.resolve(this._distPath, '.compiled');

        compiler.hooks.afterPlugins.tap('ProcTranslationsPlugin', (compilation) => {
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

            compiler.options.resolve.alias = {
                ...compiler.options.resolve.alias,
                ... loadModulePathMap(this._conf, this._srcPath, this._distPath)
            };
            console.log("\x1b[44m", 'Defined aliases:', "\x1b[0m");
            Object.keys(compiler.options.resolve.alias).forEach(item => {
                console.log("\x1b[32m", item, "\x1b[0m", '\u21D2', compiler.options.resolve.alias[item]);
            });
        });

        // Cleanup phase - remove temp directory after compilation
        compiler.hooks.afterEmit.tap('ProcTranslationsPlugin', (compilation) => {
            if (fs.existsSync(tmpJsDir)) {
                try {
                    fs.readdirSync(tmpJsDir).forEach(item => {
                        fs.unlinkSync(path.resolve(tmpJsDir, item));
                    });
                    fs.rmdirSync(tmpJsDir);
                    console.log("\x1b[33m", 'Cleaned up temporary directory:', tmpJsDir, "\x1b[0m");
                } catch (err) {
                    console.log('Error cleaning up temp directory:', err);
                }
            }
        });
    }
}


export function loadConf(path) {
    const conf = JSON.parse(fs.readFileSync(path, 'utf-8'));
    if (conf['import']) {
        console.log('Importing configuration from:', conf.import);
        const importedConf = JSON.parse(fs.readFileSync(conf['import'], 'utf-8'));
        Object.assign(importedConf, conf);
        return importedConf;
    }
    return conf;
};
