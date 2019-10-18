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
import { ServerConf, ClientStaticConf, WordFreqDbConf } from '../conf';
import { Database } from 'sqlite3';
import { IToolbarProvider } from '../common/hostPage';
import { ILogQueue } from './logging/abstract';
import { QueryType } from '../common/query';

export class WordDatabases {

    private readonly single:{[lang:string]:Database};

    private readonly cmp:{[lang:string]:Database};

    private readonly translat:{[lang:string]:Database};

    constructor(conf:WordFreqDbConf) {
        const uniqDb = {};
        this.single = {};
        this.cmp = {};
        this.translat = {};
        Object.entries(conf.single.databases || {}).forEach(([lang, path]:[string, string]) => {
            if (!uniqDb[path]) {
                uniqDb[path] = new Database(path);
                console.log(`Initialized frequency database ${path}`);
                this.single[lang] = uniqDb[path];
            }
        });
        Object.entries(conf.cmp.databases || {}).forEach(([lang, path]:[string, string]) => {
            if (!uniqDb[path]) {
                uniqDb[path] = new Database(path);
                console.log(`Initialized frequency database ${path}`);
                this.cmp[lang] = uniqDb[path];
            }
        });
        Object.entries(conf.translat.databases || {}).forEach(([lang, path]:[string, string]) => {
            if (!uniqDb[path]) {
                uniqDb[path] = new Database(path);
                console.log(`Initialized frequency database ${path}`);
                this.translat[lang] = uniqDb[path];
            }
        });
    }

    getDatabase(qType:QueryType, lang:string):Database {
        switch (qType) {
            case QueryType.SINGLE_QUERY:
                return this.single[lang];
            case QueryType.CMP_QUERY:
                return this.cmp[lang];
            case QueryType.TRANSLAT_QUERY:
                return this.translat[lang];
            default:
                throw new Error(`Query type ${qType} not supported`);
        }
    }
}

export interface Services {
    serverConf:ServerConf;
    clientConf:ClientStaticConf;
    db:WordDatabases;
    telemetryDB:Database;
    toolbar:IToolbarProvider;
    translations:{[loc:string]:{[key:string]:string}};
    logging:ILogQueue;
}
