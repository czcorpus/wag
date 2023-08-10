/*
 * Copyright 2022 Tomas Machalek <tomas.machalek@gmail.com>
 * Copyright 2022 Institute of the Czech National Corpus,
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

import { Dict } from 'cnc-tskit';
import { ClientStaticConf, CommonTextStructures } from '../conf'


export class ApiServices {

    private readonly apiKeyStorage:{[url:string]:{[header:string]:string}};

    private readonly clientConf:ClientStaticConf;

    constructor(clientConf:ClientStaticConf) {
        this.apiKeyStorage = {};
        this.clientConf = clientConf;
    }

    getApiHeaders(apiUrl:string) {
        return this.apiKeyStorage[apiUrl] || {};
    }

    translateResourceMetadata(corpname:string, value:keyof CommonTextStructures) {
        return value;
    }

    getCommonResourceStructure(corpname:string, struct:keyof CommonTextStructures) {
        return typeof this.clientConf.dataReadability === 'string' ?
                struct :
                (this.clientConf.dataReadability?.commonStructures[corpname] || {})[struct];
    }

    importExternalMessage(label:string|{[lang:string]:string}) {
        if (typeof label === 'string') {
            return label;
        }
        if ('en-US' in label) {
            return label['en-US'];
        }
        if ('en' in label) {
            return label['en'];
        }
        return '??';
    }

    setApiKeyHeader(apiUrl:string, headerName:string, key:string):void {
        if (!Dict.hasKey(apiUrl, this.apiKeyStorage)) {
            this.apiKeyStorage[apiUrl] = {};
        }
        this.apiKeyStorage[apiUrl][headerName] = key;
    }
}