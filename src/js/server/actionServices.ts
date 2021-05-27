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

import { Dict, List, pipe } from 'cnc-tskit';
import * as winston from 'winston';

import { ServerConf, ClientStaticConf, WordFreqDbConf, FreqDbConf } from '../conf';
import { IToolbarProvider } from '../page/hostPage';
import { IQueryLog } from './queryLog/abstract';
import { QueryType } from '../query/index';
import { IFreqDB } from './freqdb/freqdb';
import { createInstance, FreqDBType } from './freqdb/factory';
import { Database } from 'sqlite3';
import { IApiServices } from '../appServices';
import { IActionWriter } from './actionLog/abstract';



export class WordDatabases {

    private readonly single:{[lang:string]:IFreqDB};

    private readonly cmp:{[lang:string]:IFreqDB};

    private readonly translat:{[lang:string]:IFreqDB};

    constructor(conf:WordFreqDbConf, apiServices:IApiServices) {
        const uniqDb = {};
        this.single = {};
        this.cmp = {};
        this.translat = {};

        const databases:Array<[{[lang:string]:FreqDbConf}, {[lang:string]:IFreqDB}, QueryType]> = [
            [conf.single.databases || {}, this.single, QueryType.SINGLE_QUERY],
            [conf.cmp.databases || {}, this.cmp, QueryType.CMP_QUERY],
            [conf.translat.databases || {}, this.translat, QueryType.TRANSLAT_QUERY]
        ];
        databases.forEach(([dbConf, targetConf, ident]) => {
            pipe(
                dbConf,
                Dict.toEntries(),
                List.forEach(
                    ([lang, db]:[string, FreqDbConf]) => {
                        if (!uniqDb[db.path]) {
                            uniqDb[db.path] = createInstance(
                                db.dbType as FreqDBType,
                                db.path,
                                db.corpusSize,
                                apiServices,
                                db.options || {}
                            );
                        }
                        targetConf[lang] = uniqDb[db.path];
                        console.info(`Initialized '${ident}' mode frequency database ${db.path} (corpus size: ${db.corpusSize})`);
                    }
                )
            )
        });
    }

    getDatabase(qType:QueryType, lang:string):IFreqDB {
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
    version:string;
    repositoryUrl:string;
    serverConf:ServerConf;
    clientConf:ClientStaticConf;
    db:WordDatabases;
    telemetryDB:Database;
    toolbar:IToolbarProvider;
    translations:{[loc:string]:{[key:string]:string}};
    queryLog:IQueryLog;
    errorLog:winston.Logger;
    actionWriter:IActionWriter;
}
