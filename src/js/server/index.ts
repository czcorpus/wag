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
import 'winston-daily-rotate-file';

import { ClientStaticConf, ServerConf, LanguageLayoutsConfig } from '../conf';
import { parseJsonConfig, loadTiles } from '../conf/loader';
import { wdgRouter } from './routes/index';
import { createToolbarInstance } from './toolbar/factory';
import { RedisLogQueue } from './logging/redisQueue';
import { NullLogQueue } from './logging/nullQueue';
import { WordDatabases } from './actionServices';

(async () => {
    const app = express();
    app.use(cookieParser());
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(session({
        secret: 'keyboard cat',
        resave: false,
        saveUninitialized: true
    }));

    const serverConf:ServerConf = process.env.SERVER_CONF ?
            parseJsonConfig(process.env.SERVER_CONF) :
            parseJsonConfig(path.resolve(__dirname, '../conf/server.json'));
    const clientConfPath = process.env.WDGLANCE_CONF ?
        process.env.WDGLANCE_CONF :
        path.resolve(__dirname, '../conf/wdglance.json');

    const clientConf:ClientStaticConf = parseJsonConfig(clientConfPath);
    if (typeof clientConf.layouts === 'string') {
        clientConf.layouts = parseJsonConfig(clientConf.layouts);
    }
    if (typeof clientConf.tiles === 'string') {
        clientConf.tiles = parseJsonConfig(clientConf.tiles);

    } else if (!clientConf.tiles) {
        console.log(`Loading configuration for tiles - using database ${serverConf.tileDB ? serverConf.tileDB.server : '??'}`)
        clientConf.tiles = await loadTiles(
            clientConf.layouts as LanguageLayoutsConfig,
            serverConf.tileDB
        );
    }
    if (typeof clientConf.colors === 'string') {
        clientConf.colors = parseJsonConfig(clientConf.colors);
    }

    const pkgInfo = parseJsonConfig<{version:string, repository:{url:string}}>(path.resolve(__dirname, '../package.json'));

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
        logging: serverConf.logQueue ?
                new RedisLogQueue(serverConf.logQueue) :
                new NullLogQueue(),
        errorLog: logger,
        version: pkgInfo.version,
        repositoryUrl: pkgInfo.repository.url
    })(app);

    const server = app.listen(serverConf.port, serverConf.address, () => {
        const addr = server.address();
        console.log(`Wdglance server is running @ ${typeof addr === 'string' ? addr : addr.address + ':' + addr.port}`);
    });

})();