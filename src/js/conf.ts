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
import { DbValueMapping, HTTPHeaders, LocalizedConfMsg, QueryPoS } from './common/types';
import { CollocationsTileConf } from './tiles/collocations';
import { ConcordanceTileConf } from './tiles/concordance';
import { FreqBarTileConf } from './tiles/freqBar';
import { FreqPieTileConf } from './tiles/freqPie';
import { GeoAreasTileConf } from './tiles/geoAreas';
import { MergeCorpFreqTileConf } from './tiles/mergeCorpFreq';
import { SyDTileConf } from './tiles/syd';
import { TimeDistTileConf } from './tiles/timeDistrib';
import { TreqTileConf } from './tiles/treq';
import { WordFreqTileConf } from './tiles/wordFreq';
import { ConcFilterTileConf } from './tiles/concFilter';




export type AnyTileConf =
    ConcordanceTileConf |
    FreqBarTileConf |
    TreqTileConf |
    SyDTileConf |
    FreqPieTileConf |
    TimeDistTileConf |
    CollocationsTileConf |
    WordFreqTileConf |
    MergeCorpFreqTileConf |
    GeoAreasTileConf |
    ConcFilterTileConf;

/**
 * A page configuration based on
 * user specific information/input.
 */
export interface UserConf {
    uiLang:string;
    queryType:string;
	query1Lang:string;
    query2Lang:string;
    queryPos?:QueryPoS;
    query1:string;
    lemma1?:string;
    query2:string;
    answerMode:boolean;
}

/**
 * This specifies a 'theming' for
 * JavaScript generated stuff
 * (mainly chart colors).
 */
export interface ColorsConf {
    category:Array<string>;
    categoryOther:string;
    bar:Array<string>;
    scale:Array<string>;
}


export interface LayoutConfig {
    groupLabel:LocalizedConfMsg;
    groupDesc:LocalizedConfMsg;
    groupTemplate:any; // TODO unfinished concept
    tiles:Array<{tile:string; width:number}>;
}

export interface LayoutsConfig {
    single:Array<LayoutConfig|string>;
    cmp:Array<LayoutConfig|string>;
    translat:Array<LayoutConfig|string>;
}

/**
 * Client side app configuration as present in wdglance.json
 * configuration file.
 */
export interface ClientStaticConf {
    rootUrl:string;
	hostUrl:string;
	corpInfoApiUrl:string;
    dbValuesMapping:DbValueMapping;
    apiHeaders:{[urlPrefix:string]:HTTPHeaders};
    colors:ColorsConf;
    tiles:{[lang:string]:{[ident:string]:AnyTileConf}};
	layouts:LayoutsConfig;
}

export const mkRuntimeClientConf = (conf:ClientStaticConf, lang:string):ClientConf => ({
    rootUrl: conf.rootUrl,
    hostUrl: conf.hostUrl,
    corpInfoApiUrl: conf.corpInfoApiUrl,
    dbValuesMapping: conf.dbValuesMapping,
    apiHeaders: conf.apiHeaders,
    colors: conf.colors,
    tiles: conf.tiles[lang],
    layouts: conf.layouts
});

/**
 * Client side app configuration as generated
 * for a specific session (e.g. with tiles for
 * specific query type).
 */
export interface ClientConf {
    rootUrl:string;
	hostUrl:string;
	corpInfoApiUrl:string;
    dbValuesMapping:DbValueMapping;
    apiHeaders:{[urlPrefix:string]:HTTPHeaders};
    colors:ColorsConf;
    tiles:{[lang:string]:AnyTileConf};
	layouts:LayoutsConfig;
}

/**
 * Server side app configuration.
 */
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
        similarFreqWordsMaxCtx:number;
    };
    toolbar:{
        url:string;
    }
}