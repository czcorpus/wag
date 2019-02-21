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

export interface UserConf {
    uiLang:string;
    queryType:string;
	query1Lang:string;
	query2Lang:string;
	query1:string;
    query2:string;
    tilesConf:{[ident:string]:any};
}


export interface ClientConf {
    rootUrl:string;
	hostUrl:string;
	corpInfoApiUrl:string;
	tiles:{[lang:string]:{[ident:string]:any}};
	layouts:any;
}

export interface ServerConf {
    address:string;
    port:number;
    staticFilesUrl:string;
    languages:{[code:string]:string};
    develServer:{
        port:number;
        urlRootPath:string;
    };
    auxServices:{
        wordDistribDb:string;
        similarFreqWordsCtx:[number, number];
    };
}