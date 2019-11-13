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
import { ServerConf, ClientStaticConf, WordFreqDbConf, FreqDbConf } from '../conf';
import { Database } from 'sqlite3';
import { IToolbarProvider } from '../common/hostPage';
import { ILogQueue } from './logging/abstract';
import { QueryType } from '../common/query';


export interface WordDatabase {
    conn:Database;
    corpusSize:number;
}


export class WordDatabases {

    private readonly single:{[lang:string]:WordDatabase};

    private readonly cmp:{[lang:string]:WordDatabase};

    private readonly translat:{[lang:string]:WordDatabase};

    constructor(conf:WordFreqDbConf) {
        const uniqDb = {};
        this.single = {};
        this.cmp = {};
        this.translat = {};
        [
            [conf.single.databases || {}, this.single, 'single'],
            [conf.cmp.databases || {}, this.cmp, 'cmp'],
            [conf.translat.databases || {}, this.translat, 'translat']

        ].forEach(([dbConf, targetConf, ident]) => {
            Object.entries(dbConf).forEach(([lang, db]:[string, FreqDbConf]) => {
                if (!uniqDb[db.path]) {
                    uniqDb[db.path] = {conn: new Database(db.path), corpusSize: db.corpusSize};
                }
                targetConf[lang] = uniqDb[db.path];
                console.log(`Initialized '${ident}' mode frequency database ${db.path} (corpus size: ${db.corpusSize})`);
            });
        });
    }

    getDatabase(qType:QueryType, lang:string):WordDatabase {
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
