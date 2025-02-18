/*
 * Copyright 2020 Tomas Machalek <tomas.machalek@gmail.com>
 * Copyright 2020 Institute of the Czech National Corpus,
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

import { IFreqDB } from './freqdb.js';
import { SqliteFreqDB } from './backends/sqlite.js';
import { KontextFreqDB } from './backends/kontext.js';
import { FreqDbOptions } from '../../conf/index.js';
import { CouchFreqDB } from './backends/couchdb/index.js';
import { KorpusFreqDB } from './backends/korpusdb.js';
import { IApiServices } from '../../appServices.js';
import { FrodoClient } from './backends/frodo.js';


export enum FreqDBType {
    SQLITE = 'sqlite',
    KONTEXT = 'kontext',
    COUCHDB = 'couchdb',
    KORPUSDB = 'korpusdb',
    FRODO = 'frodo'
}


export function createInstance(dbType:FreqDBType, connPath:string, corpusSize:number, apiServices:IApiServices, options:FreqDbOptions):IFreqDB {
    switch (dbType) {
        case FreqDBType.SQLITE:
            return new SqliteFreqDB(connPath, corpusSize);
        case FreqDBType.KONTEXT:
            return new KontextFreqDB(connPath, corpusSize, apiServices, options);
        case FreqDBType.COUCHDB:
            return new CouchFreqDB(connPath, corpusSize, apiServices, options);
        case FreqDBType.KORPUSDB:
            return new KorpusFreqDB(connPath, apiServices, options);
        case FreqDBType.FRODO:
            return new FrodoClient(connPath, corpusSize, apiServices);
        default:
            throw new Error(`Frequency database ${dbType} is not supported`);
    }
}
