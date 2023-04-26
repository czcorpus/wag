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
import * as cookieParser from 'cookie-parser';
import * as express from 'express';
import * as session from 'express-session';
import * as path from 'path';
import * as sqlite3 from 'sqlite3';
import * as translations from 'translations';
import * as winston from 'winston';
import { forkJoin, of as rxOf, Observable } from 'rxjs';
import { concatMap, map, tap } from 'rxjs/operators';
import { Dict, Ident, List, tuple } from 'cnc-tskit';
import 'winston-daily-rotate-file';
import * as sessionFileStore from 'session-file-store';
import { CookieJar, Cookie } from 'tough-cookie';

import { ClientStaticConf, ServerConf, DomainLayoutsConfig, DomainAnyTileConf, isTileDBConf, ColorsConf, DataReadabilityMapping, CommonTextStructures } from '../conf';
import { validateTilesConf } from '../conf/validation';
import { parseJsonConfig, loadRemoteTileConf, useCommonLayouts } from '../conf/loader';
import { wdgRouter } from './routes/index';
import { createToolbarInstance } from './toolbar/factory';
import { WordDatabases } from './actionServices';
import { PackageInfo } from '../types';
import { WinstonActionWriter } from './actionLog/winstonWriter';
import { ApiServices } from './apiServices';


function loadTilesConf(clientConf:ClientStaticConf):Observable<DomainAnyTileConf> {
    if (typeof clientConf.tiles === 'string') {
        return parseJsonConfig(clientConf.tiles);

    } else if (isTileDBConf(clientConf.tiles)) {
        return loadRemoteTileConf(
            clientConf.layouts as DomainLayoutsConfig,
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

function loadDataReadabilityConf(clientConf:ClientStaticConf):Observable<DataReadabilityMapping> {
    return typeof clientConf.dataReadability === 'string' ?
        parseJsonConfig(clientConf.dataReadability) :
        rxOf(clientConf.dataReadability);
}

function createCookieJarMiddleware() {

    return (req: express.Request, res: express.Response, next) => {
        const cookieJar = new CookieJar();
        const domain = req ? req.headers['host'] : 'localhost';
        const protocol = req.headers['x-forwarded-proto'] ?
                req.headers['x-forwarded-proto'] : req.protocol;
        List.forEach(
            ([cname, cvalue]) => {
                const cookie = Cookie.parse(`${cname}=${cvalue}`);
                cookieJar.setCookieSync(cookie, `${protocol}://${domain}`);
            },
            Object.entries(req.cookies)
        );
        req['cookieJar'] = cookieJar;
        next();
    };
}


forkJoin([ // load core configs
    parseJsonConfig<ServerConf>(process.env.SERVER_CONF ?
        process.env.SERVER_CONF :
        path.resolve(__dirname, '../conf/server.json')),
    parseJsonConfig<ClientStaticConf>(process.env.WDGLANCE_CONF ?
        process.env.WDGLANCE_CONF :
        path.resolve(__dirname, '../conf/wdglance.json')),
    parseJsonConfig<PackageInfo>(path.resolve(__dirname, '../package.json')),

]).pipe(
    concatMap( // load layouts config
        ([serverConf, clientConf, pkgInfo]) => (typeof clientConf.layouts === 'string' ?
            parseJsonConfig<DomainLayoutsConfig>(clientConf.layouts) :
            rxOf(clientConf.layouts)
        ).pipe(
            map<DomainLayoutsConfig, [ServerConf, ClientStaticConf, PackageInfo]>(
                (layoutsExp) => {
                    clientConf.layouts = useCommonLayouts(layoutsExp);
                    return [serverConf, clientConf, pkgInfo];
                }
            )
        )
    ),
    concatMap( // load tile and theme definitions
        ([serverConf, clientConf, pkgInfo]) => forkJoin([
            loadTilesConf(clientConf),
            loadColorsConf(clientConf),
            loadDataReadabilityConf(clientConf)

        ]).pipe(
            map(
                ([tiles, colors, dataReadability]) => {
                    clientConf.tiles = tiles;
                    clientConf.colors = colors;
                    clientConf.dataReadability = dataReadability;
                    return tuple(serverConf, clientConf, pkgInfo);
                }
            ),
            tap( // validate tiles
                ([,clientConf,]) => {
                    if (!validateTilesConf(clientConf.tiles as DomainAnyTileConf)) {
                        throw Error('\uD83D\uDC4E Invalid tile config found!');
                    }
                }
            )
        )
    )

).subscribe({
    next: ([serverConf, clientConf, pkgInfo]) => {
        const app = express();
        const FileStore = sessionFileStore(session)
        app.set('query parser', 'simple');
        app.set('trust proxy', true);
        app.use(express.json());
        app.use(express.urlencoded({ extended: true }));
        app.use(cookieParser());
        app.use(session({
            name: 'wag.session',
            cookie: {
                maxAge: serverConf.sessions?.ttl ? serverConf.sessions.ttl * 1000 : undefined
            },
            store: new FileStore({
                ttl: serverConf.sessions.ttl,
                path: serverConf.sessions.path
            }),
            secret: serverConf.sessions?.secret ? serverConf.sessions.secret : Ident.puid(),
            resave: true,
            saveUninitialized: true
        }));
        app.use(createCookieJarMiddleware());

        const db:WordDatabases = new WordDatabases(
            serverConf.freqDB,
            new ApiServices(clientConf)
        );

        const toolbar = createToolbarInstance(serverConf.toolbar);

        const logger = winston.createLogger({
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
            )
        });

        if (process.env.NODE_ENV !== 'production') {
            logger.add(new winston.transports.Console());
        }

        if (serverConf.logging) {
            if (serverConf.logging.rotation) {
                logger.add(new winston.transports.DailyRotateFile({
                    filename: serverConf.logging.path,
                    maxFiles: '7d',
                    createSymlink: true
                }));

            } else {
                logger.add(new winston.transports.File({filename: serverConf.logging.path}));
            }
        }

        console.info = (msg:string,...args:Array<any>) => logger.info(msg,...args);
        console.warn = (msg:string, ...args:Array<any>) => logger.warn(msg, ...args);
        console.error = (msg:string, ...args:Array<any>) => logger.error(msg, ...args);

        wdgRouter({
            serverConf,
            clientConf,
            db,
            telemetryDB: serverConf.telemetryDB ? new sqlite3.Database(serverConf.telemetryDB) : null,
            translations,
            toolbar,
            errorLog: logger,
            actionWriter: new WinstonActionWriter(logger),
            version: pkgInfo.version,
            repositoryUrl: pkgInfo.repository.url
        })(app);

        const server = app.listen(serverConf.port, serverConf.address, () => {
            const addr = server.address();
            console.info(`WaG server is running @ ${typeof addr === 'string' ? addr : addr.address + ':' + addr.port}`);
        });
    },
    error: error => {
        console.error('Failed to start WaG: ', error['message'] || error.constructor.name);
        process.exit(1);
    }
});
