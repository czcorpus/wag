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
import { DbValueMapping, HTTPHeaders, LocalizedConfMsg } from './common/types';
import { QueryPoS, QueryType, SearchLanguage } from './common/query';
import { CollocationsTileConf } from './tiles/collocations';
import { ConcFilterTileConf } from './tiles/concFilter';
import { ConcordanceTileConf } from './tiles/concordance';
import { FreqBarTileConf } from './tiles/freqBar';
import { FreqPieTileConf } from './tiles/freqPie';
import { GeoAreasTileConf } from './tiles/geoAreas';
import { MergeCorpFreqTileConf } from './tiles/mergeCorpFreq';
import { SyDTileConf } from './tiles/syd';
import { TimeDistTileConf } from './tiles/timeDistrib/common';
import { TreqTileConf } from './tiles/treq';
import { TreqSubsetsTileConf } from './tiles/treqSubsets';
import { WordFreqTileConf } from './tiles/wordFreq';
import { WordFormsTileConf } from './tiles/wordForms';
import { SpeechesTileConf } from './tiles/speeches';


export type AnyTileConf =
    ConcordanceTileConf |
    FreqBarTileConf |
    TreqTileConf |
    TreqSubsetsTileConf |
    SyDTileConf |
    FreqPieTileConf |
    TimeDistTileConf |
    CollocationsTileConf |
    WordFreqTileConf |
    MergeCorpFreqTileConf |
    GeoAreasTileConf |
    ConcFilterTileConf |
    WordFormsTileConf |
    SpeechesTileConf;

/**
 * A page configuration based on
 * user specific information/input.
 */
export interface UserConf {
    uiLanguages:{[code:string]:string};
    uiLang:string;
    queryType:string;
	query1Lang:string;
    query2Lang:string;
    queryPos:Array<QueryPoS>;
    query1:string;
    lemma1?:string;
    query2:string;
    answerMode:boolean;
    error?:string;
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
    groupDescURL:LocalizedConfMsg;
    groupTemplate:any; // TODO unfinished concept
    tiles:Array<{tile:string; width:number}>;
}

export interface LayoutsConfig {
    single:Array<LayoutConfig|string>;
    cmp:Array<LayoutConfig|string>;
    translat:Array<LayoutConfig|string>;
}

export interface HomePageTileConf {
    label:{[lang:string]:string};
    contents:{[lang:string]:string|{file:string}};
}

export interface HomepageConf {
    tiles:Array<HomePageTileConf>;
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
    reqCacheTTL:number;
    onLoadInit?:Array<string>;
    homepage:HomepageConf;
    colors:ColorsConf;
    searchLanguages:{[code:string]:string};

    // If string we expect this to be a fs path to another
    // JSON file containing just the 'tiles' configuration
    tiles:{[lang:string]:{[ident:string]:AnyTileConf}}|string;

    // If string we expect this to be a fs path to another
    // JSON file containing just the 'layout' configuration.
	layouts:{[lang:string]:LayoutsConfig}|string;
}

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
    colors:ColorsConf;
    reqCacheTTL:number;
    onLoadInit:Array<string>;
    apiHeaders:{[urlPrefix:string]:HTTPHeaders};
    homepage:{tiles:Array<{label:string; html:string}>};
    tiles:{[ident:string]:AnyTileConf};
    layouts:LayoutsConfig;
    searchLanguages:Array<SearchLanguage>;
    error?:Error;
}

export function emptyClientConf(conf:ClientStaticConf):ClientConf {
    return {
        rootUrl: conf.rootUrl,
        hostUrl: conf.hostUrl,
        corpInfoApiUrl: conf.corpInfoApiUrl,
        apiHeaders: conf.apiHeaders,
        dbValuesMapping: conf.dbValuesMapping,
        reqCacheTTL: conf.reqCacheTTL,
        onLoadInit: conf.onLoadInit,
        colors: conf.colors,
        tiles: {},
        layouts: {single: [], cmp: [], translat: []},
        homepage: {
            tiles: []
        },
        searchLanguages: Object.keys(conf.searchLanguages).map(k => ({
            code: k,
            label: conf.searchLanguages[k],
            queryTypes: []
        }))
    };
}

export function getSupportedQueryTypes(conf:ClientStaticConf, lang:string):Array<QueryType> {
    if (typeof conf.layouts === 'string') {
        return [];
    }
    const layout = conf.layouts[lang] || {single: [], translat: [], cmp: []};
    const ans:Array<QueryType> = [];
    if (Array.isArray(layout.single) && layout.single.length > 0) {
        ans.push(QueryType.SINGLE_QUERY);
    }
    if (Array.isArray(layout.translat) && layout.translat.length > 0) {
        ans.push(QueryType.TRANSLAT_QUERY);
    }
    if (Array.isArray(layout.cmp) && layout.cmp.length > 0) {
        ans.push(QueryType.CMP_QUERY);
    }
    return ans;
}


export interface ToolbarDef {
    type:string;
    url?:string;
}

export interface LogQueueConf {
    host:string;
    port:number;
    db:number;
    key:string;
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
    freqDB:{
        databases:{[lang:string]:string};
        similarFreqWordsMaxCtx:number;
        minLemmaFreq:number;
    };
    logQueue?:LogQueueConf;
    toolbar:ToolbarDef;
    langCookie?:string;
}