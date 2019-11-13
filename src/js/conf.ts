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
import { TileConf } from './common/tile';

/**
 * A page configuration based on
 * user specific information/input.
 */
export interface UserConf {
    uiLanguages:{[code:string]:string};
    uiLang:string;
    queries:Array<string>;
    queryPos:Array<Array<QueryPoS>>;
    lemma?:Array<string>;
    queryType:QueryType;
	query1Lang:string;
    query2Lang:string;
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


export interface GroupLayoutConfig {
    groupLabel:LocalizedConfMsg;
    groupDescURL?:LocalizedConfMsg;
    groupTemplate?:any; // TODO unfinished concept
    tiles:Array<{tile:string; width:number}>;
}

export type GroupItemConfig = GroupLayoutConfig|string;

export interface LayoutConfigCommon {
    groups:Array<GroupItemConfig>;
    allowMultiWordQuery?:boolean;
}

export interface LayoutConfigSingleQuery extends LayoutConfigCommon {}

export interface LayoutConfigCmpQuery extends LayoutConfigCommon {}


export interface LayoutConfigTranslatQuery extends LayoutConfigCommon {
    targetLanguages:Array<string>;
}

export interface LayoutsConfig {
    single?:LayoutConfigSingleQuery;
    cmp?:LayoutConfigCmpQuery;
    translat?:LayoutConfigTranslatQuery;
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

    // A list of URLs used to style specific content (e.g. HTML tiles)
    externalStyles?:Array<string>;

    // If string we expect this to be a fs path to another
    // JSON file containing just the 'tiles' configuration
    tiles:LanguageAnyTileConf|string;

    // If string we expect this to be a fs path to another
    // JSON file containing just the 'layout' configuration.
    layouts:LanguageLayoutsConfig|string;

    telemetry?:{
        sendIntervalSecs:number;
        participationProbability:number;
    };
}

/**
 * These types are necessary to create config schemata
 * using Makefile for tiles and layouts only
 */
export interface LanguageLayoutsConfig {[lang:string]:LayoutsConfig};
export interface LanguageAnyTileConf {[lang:string]:{[ident:string]:TileConf}};

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
    tiles:{[ident:string]:TileConf};
    layouts:LayoutsConfig;
    searchLanguages:Array<SearchLanguage>;
    externalStyles:Array<string>;
    error?:Error;
    telemetry?:{
        sendIntervalSecs:number;
        participationProbability:number;
    };
}

export function emptyLayoutConf():LayoutsConfig {
    return {
        single: {
            groups: []
        },
        cmp: {
            groups: []
        },
        translat: {
            groups: [],
            targetLanguages: []
        }
    };
}

export function emptyClientConf(conf:ClientStaticConf):ClientConf {
    return {
        rootUrl: conf.rootUrl,
        hostUrl: conf.hostUrl,
        corpInfoApiUrl: conf.corpInfoApiUrl,
        apiHeaders: conf.apiHeaders,
        dbValuesMapping: conf.dbValuesMapping,
        reqCacheTTL: conf.reqCacheTTL,
        onLoadInit: conf.onLoadInit || [],
        colors: conf.colors,
        tiles: {},
        layouts: emptyLayoutConf(),
        homepage: {
            tiles: []
        },
        searchLanguages: Object.keys(conf.searchLanguages).map(k => ({
            code: k,
            label: conf.searchLanguages[k],
            queryTypes: []
        })),
        externalStyles: []
    };
}

export function getSupportedQueryTypes(conf:ClientStaticConf, lang:string):Array<QueryType> {
    if (typeof conf.layouts === 'string') {
        return [];
    }
    const layout = conf.layouts[lang] || emptyLayoutConf();
    const ans:Array<QueryType> = [];
    if (layout.single && Array.isArray(layout.single.groups) && layout.single.groups.length > 0) {
        ans.push(QueryType.SINGLE_QUERY);
    }
    if (layout.translat && Array.isArray(layout.translat.groups) && layout.translat.groups.length > 0) {
        ans.push(QueryType.TRANSLAT_QUERY);
    }
    if (layout.cmp && Array.isArray(layout.cmp.groups) && layout.cmp.groups.length > 0) {
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

export interface FreqDbConf {
    path:string;
    corpusSize:number;
}

export interface QueryModeWordDb {
    minLemmaFreq:number;
    databases:{[lang:string]:FreqDbConf};
};

export interface SingleModeWordDb extends QueryModeWordDb {
    similarFreqWordsMaxCtx:number;
}

export interface WordFreqDbConf {
    single?:SingleModeWordDb;
    cmp?:QueryModeWordDb;
    translat?:QueryModeWordDb;
}

/**
 * Server side app configuration.
 */
export interface ServerConf {
    address:string;
    port:number;
    staticFilesUrl:string; // static (= non-compiled) stuff path (images etc.)
    distFilesUrl:string; // this ensures Webpack to resolve dynamic imports properly
    languages:{[code:string]:string};
    develServer:{
        port:number;
        urlRootPath:string;
    };
    freqDB:WordFreqDbConf;
    logQueue?:LogQueueConf;
    toolbar:ToolbarDef;
    langCookie?:string;
    telemetryDB?:string;
}

export function getQueryTypeFreqDb(conf:ServerConf, queryType:QueryType):QueryModeWordDb {
    switch (queryType) {
        case QueryType.SINGLE_QUERY:
            return conf.freqDB.single || {minLemmaFreq: 0, databases: {}, similarFreqWordsMaxCtx: 0};
        case QueryType.CMP_QUERY:
            return conf.freqDB.cmp || {minLemmaFreq: 0, databases: {}};
        case QueryType.TRANSLAT_QUERY:
            return conf.freqDB.translat || {minLemmaFreq: 0, databases: {}};
        default:
            throw new Error(`Unknown query type ${queryType}`);
    }
}
