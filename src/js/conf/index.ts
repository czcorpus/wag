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
import { DbValueMapping, HTTPHeaders, LocalizedConfMsg } from '../common/types';
import { QueryType, SearchLanguage } from '../common/query/index';
import { TileConf } from '../common/tile';
import { CSSProperties } from 'react';
import { List, pipe } from 'cnc-tskit';

export const DEFAULT_WAIT_FOR_OTHER_TILES = 60;

export const THEME_COOKIE_NAME = 'wag_theme';
export const THEME_DEFAULT_NAME = 'default';
export const THEME_DEFAULT_LABEL = 'Default';

export interface UserQuery {
    word:string;
    pos:Array<string>;
    lemma?:string;
}

/**
 * A page configuration based on
 * user specific information/input.
 */
export interface UserConf {
    uiLanguages:{[code:string]:string};
    uiLang:string;
    queries:Array<UserQuery>;
    queryType:QueryType;
	query1Lang:string;
    query2Lang:string;
    answerMode:boolean;
    error?:[number, string]; // server error (e.g. bad request)
}

export function errorUserConf(uiLanguages:{[code:string]:string}, error:[number, string], uiLang:string):UserConf {
    return {
        uiLanguages: uiLanguages,
        uiLang: uiLang,
        queries: [],
        queryType: QueryType.SINGLE_QUERY,
        query1Lang: '',
        query2Lang: '',
        answerMode: false, // ??
        error: error
    };
}

export interface ColorThemeIdent {
    themeId:string;
    themeLabel:LocalizedConfMsg;
    description?:LocalizedConfMsg;
}

/**
 * This specifies a 'theming' for
 * JavaScript generated stuff
 * (mainly chart colors).
 */
export interface ColorTheme extends ColorThemeIdent {
    category:Array<string>;
    categoryOther:string;
    cmpCategory:Array<string>;
    scale:Array<string>;
    geoAreaSpotFillColor:string;
    geoAreaSpotTextColor?:string;
}

export interface ColorsConf {
    themes:Array<ColorTheme>;
    default:string;
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
    maxQueryWords?:number;
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

export interface HomePageTileConfI18n {
    label:{[lang:string]:string};
    contents:{[lang:string]:string|{file:string}};
}

export interface HomepageConfI18n {
    tiles:Array<HomePageTileConfI18n>;
}

export interface FaviconConf {
    contentType:string;
    url:string;
}

export interface LogoConf {
    url:string;
    inlineStyle?:CSSProperties;
}

/**
 * Client side app configuration as present in wdglance.json
 * configuration file.
 */
export interface ClientStaticConf {
    rootUrl:string;
    hostUrl:string;
    favicon?:FaviconConf;
    logo?:LogoConf;
	corpInfoApiUrl:string;
    dbValuesMapping:DbValueMapping;
    apiHeaders:{[urlPrefix:string]:HTTPHeaders};
    reqCacheTTL:number;
    onLoadInit?:Array<string>;
    issueReportingUrl?:string;
    maxTileErrors:number;
    homepage:HomepageConfI18n;
    colors?:ColorsConf|string;
    searchLanguages:{[code:string]:string};

    // A list of URLs used to style specific content (e.g. HTML tiles)
    externalStyles?:Array<string>;

    // If string we expect this to be a fs path to another
    // JSON file containing just the 'tiles' configuration
    tiles:MultiSourceTileConf;

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

export interface TileDbConf {
    server:string; // e.g. http://foo:5984
    db:string;
    prefix:string; // e.g. 'cnc:wag-test'
    username:string;
    password:string; // please do not use admin credentials for this
}

export function isTileDBConf(tiles: TileDbConf|LanguageAnyTileConf):tiles is TileDbConf {
    return (tiles as TileDbConf).server !== undefined;
}

type MultiSourceTileConf = LanguageAnyTileConf|string|TileDbConf;


export interface HomepageTileConf {
    label:string;
    html:string;
}

/**
 * Client side app configuration as generated
 * for a specific session (e.g. with tiles for
 * specific query type).
 */
export interface ClientConf {
    rootUrl:string;
    hostUrl:string;
    favicon:FaviconConf|null;
	corpInfoApiUrl:string;
    dbValuesMapping:DbValueMapping;
    logo:LogoConf|null;
    colors:ColorTheme;
    colorThemes:Array<ColorThemeIdent>;
    reqCacheTTL:number;
    onLoadInit:Array<string>;
    apiHeaders:{[urlPrefix:string]:HTTPHeaders};
    issueReportingUrl?:string;
    homepage:{tiles:Array<HomepageTileConf>};
    tiles:{[ident:string]:TileConf};
    layouts:LayoutsConfig;
    searchLanguages:Array<SearchLanguage>;
    externalStyles:Array<string>;
    maxTileErrors:number;
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

export function getAppliedThemeConf(conf:ClientStaticConf, themeId?:string):ColorTheme|undefined {
    let ans:ColorTheme;
    const colors = conf.colors;
    if (typeof colors === 'object') {
        if (themeId) {
            ans = List.find(t => t.themeId === themeId, colors.themes);
        }
        if (!ans) {
            ans = List.find(t => t.themeId === colors.default, colors.themes);
        }
    }
    return ans;
}

export function getThemeList(conf:ClientStaticConf):Array<ColorThemeIdent> {
    return pipe(
        typeof conf.colors === 'string' ? [] : conf.colors.themes,
        List.map(v => ({
            themeId: v.themeId,
            themeLabel: v.themeLabel ? v.themeLabel : v.themeId,
            description: v.description
        })),
        List.concat<ColorThemeIdent>([
            {
                themeId: THEME_DEFAULT_NAME,
                themeLabel: THEME_DEFAULT_LABEL
            }
        ]),
    );
}

export function emptyClientConf(conf:ClientStaticConf, themeId:string|undefined):ClientConf {
    return {
        rootUrl: conf.rootUrl,
        hostUrl: conf.hostUrl,
        favicon: conf.favicon,
        logo: conf.logo,
        corpInfoApiUrl: conf.corpInfoApiUrl,
        apiHeaders: conf.apiHeaders,
        dbValuesMapping: conf.dbValuesMapping,
        reqCacheTTL: conf.reqCacheTTL,
        onLoadInit: conf.onLoadInit || [],
        colors: getAppliedThemeConf(conf, themeId),
        colorThemes: getThemeList(conf),
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
        externalStyles: [],
        maxTileErrors: 0
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

export interface FreqDbOptions {
    urlArgs?:{[key:string]:string};
    httpHeaders?:{[key:string]:string};
    sourceInfoUrl?:string;
    username?:string;
    password?:string;

    /**
     * If N, then for any 1, 2,...,N-gram type, the database
     * is able to provide similar ARF frequency. I.e. it won't
     * mix e.g. 2-grams and 3-grams. If 0 or omitted then we assume that
     * we are not able to support such a feature and the datase
     * returns just any 1, 2,...N-grams matching entered
     * ARF. This is only supported for 1, 2, 3, 4-grams.
     */
    maxSingleTypeNgramArf?:number;
}

export interface FreqDbConf {
    dbType:string;
    path:string;
    corpusSize:number;
    options?:FreqDbOptions;
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
    logging?:{
        path:string;
        rotation:boolean;
    };
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
