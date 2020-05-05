/*
 * Copyright 2019 Tomas Machalek <tomas.machalek@gmail.com>
 * Copyright 2019 Institute of the Czech National Corpus,
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
/// <reference path="../translations.d.ts" />
import * as bodyParser from 'body-parser';
import * as cookieParser from 'cookie-parser';
import * as express from 'express';
import * as session from 'express-session';
import * as path from 'path';
import * as sqlite3 from 'sqlite3';
import * as translations from 'translations';
import * as winston from 'winston';
import { forkJoin, of as rxOf, Observable } from 'rxjs';
import { concatMap, map, tap } from 'rxjs/operators';
import { Ident } from 'cnc-tskit';
import 'winston-daily-rotate-file';

import { ClientStaticConf, ServerConf, LanguageLayoutsConfig, LanguageAnyTileConf, isTileDBConf, ColorsConf } from '../conf';
import { validateTilesConf } from '../conf/validation';
import { parseJsonConfig, loadRemoteTileConf } from '../conf/loader';
import { wdgRouter } from './routes/index';
import { createToolbarInstance } from './toolbar/factory';
import { RedisQueryLog } from './queryLog/redisQueue';
import { NullQueryLog } from './queryLog/nullQueue';
import { WordDatabases } from './actionServices';
import { PackageInfo } from '../common/types';


function loadTilesConf(clientConf:ClientStaticConf):Observable<LanguageAnyTileConf> {
    if (typeof clientConf.tiles === 'string') {
        return parseJsonConfig(clientConf.tiles);

    } else if (isTileDBConf(clientConf.tiles)) {
        return loadRemoteTileConf(
            clientConf.layouts as LanguageLayoutsConfig,
            clientConf.tiles
        );

    } else {
        return rxOf(clientConf.tiles);
    }
}


function loadColorsConf(clientConf:ClientStaticConf):Observable<ColorsConf> {
    return typeof clientConf.colors === 'string' ?
        parseJsonConfig(clientConf.colors) :
        rxOf(clientConf.colors);
}


forkJoin(
    parseJsonConfig<ServerConf>(process.env.SERVER_CONF ?
        process.env.SERVER_CONF :
        path.resolve(__dirname, '../conf/server.json')),
    parseJsonConfig<ClientStaticConf>(process.env.WDGLANCE_CONF ?
        process.env.WDGLANCE_CONF :
        path.resolve(__dirname, '../conf/wdglance.json')),
    parseJsonConfig<PackageInfo>(path.resolve(__dirname, '../package.json'))

).pipe(
    concatMap(
        ([serverConf, clientConf, pkgInfo]) => (typeof clientConf.layouts === 'string' ?
            parseJsonConfig<LanguageLayoutsConfig>(clientConf.layouts) :
            rxOf(clientConf.layouts)
        ).pipe(
            map<LanguageLayoutsConfig, [ServerConf, ClientStaticConf, PackageInfo]>(
                (layoutsExp) => {
                    clientConf.layouts = layoutsExp;
                    return [serverConf, clientConf, pkgInfo];
                }
            )
        )
    ),
    concatMap(
        ([serverConf, clientConf, pkgInfo]) => forkJoin(
            loadTilesConf(clientConf),
            loadColorsConf(clientConf)

        ).pipe(
            map(
                ([tiles, colors]) => {
                    clientConf.tiles = tiles;
                    clientConf.colors = colors;
                    const ans:[ServerConf, ClientStaticConf, PackageInfo] = [serverConf, clientConf, pkgInfo];
                    return ans;
                }
            ),
            tap(
                ([,clientConf,]) => {
                    if (!validateTilesConf(clientConf.tiles as LanguageAnyTileConf)) {
                        throw Error('\uD83D\uDC4E Invalid tile config found!');
                    }
                }
            )
        )
    )

).subscribe(
    ([serverConf, clientConf, pkgInfo]) => {
        const app = express();
        app.use(cookieParser());
        app.use(bodyParser.json());
        app.use(bodyParser.urlencoded({ extended: true }));
        app.use(session({
            secret: Ident.puid(),
            resave: false,
            saveUninitialized: true
        }));

        const db:WordDatabases = new WordDatabases(serverConf.freqDB);

        const toolbar = createToolbarInstance(serverConf.toolbar);

        const logger = winston.createLogger({
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
            ),
            transports: [
                new winston.transports.Console()
            ]
        });

        if (serverConf.logging) {
            if (serverConf.logging.rotation) {
                logger.add(new winston.transports.DailyRotateFile({
                    filename: serverConf.logging.path.includes('%DATE%') ?
                        serverConf.logging.path :
                        serverConf.logging.path + '.%DATE%',
                    datePattern: 'YYYY-MM-DD'
                }));

            } else {
                logger.add(new winston.transports.File({filename: serverConf.logging.path}));
            }
        }

        wdgRouter({
            serverConf: serverConf,
            clientConf: clientConf,
            db: db,
            telemetryDB: serverConf.telemetryDB ? new sqlite3.Database(serverConf.telemetryDB) : null,
            translations: translations,
            toolbar: toolbar,
            queryLog: serverConf.logQueue ?
                    new RedisQueryLog(serverConf.logQueue) :
                    new NullQueryLog(),
            errorLog: logger,
            version: pkgInfo.version,
            repositoryUrl: pkgInfo.repository.url
        })(app);

        const server = app.listen(serverConf.port, serverConf.address, () => {
            const addr = server.address();
            console.log(`Wdglance server is running @ ${typeof addr === 'string' ? addr : addr.address + ':' + addr.port}`);
        });
    },
    (err) => {
        console.log('Failed to start WaG: ', err['message'] || err.constructor.name);
        process.exit(1);
    }
);
