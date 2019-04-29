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
import * as fs from 'fs';
import * as path from 'path';
import * as sqlite3 from 'sqlite3';
import * as translations from 'translations';

import { ClientStaticConf, ServerConf } from '../conf';
import { wdgRouter } from './routes';
import { createToolbarInstance } from './toolbar/factory';

const app = express();
app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const serverConf:ServerConf = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../conf/conf.json'), 'utf8'));
const clientConf:ClientStaticConf = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../conf/wdglance.json'), 'utf8'));
const db = {};
for (let d in serverConf.auxServices.wordDistribDb) {
	db[d] = new sqlite3.Database(serverConf.auxServices.wordDistribDb[d]);
}
const toolbar = createToolbarInstance(serverConf.toolbar, serverConf.langCookie);

wdgRouter({
    serverConf: serverConf,
    clientConf: clientConf,
    db: db,
    translations: translations,
    toolbar: toolbar
})(app);

const server = app.listen(serverConf.port, serverConf.address, () => {
    const addr = server.address();
    console.log(`Wdglance server is running @ ${typeof addr === 'string' ? addr : addr.address + ':' + addr.port}`);
});