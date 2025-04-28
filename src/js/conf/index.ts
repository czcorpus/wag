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
import { HTTPHeaders, LocalizedConfMsg } from '../types.js';
import { QueryType, SearchDomain } from '../query/index.js';
import { TileConf } from '../page/tile.js';
import { CSSProperties } from 'react';
import { List, pipe } from 'cnc-tskit';

export const DEFAULT_WAIT_FOR_OTHER_TILES = 60;

export const THEME_COOKIE_NAME = 'wag_theme';

export type MainPosAttrValues = 'pos'|'upos';

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
	query1Domain:string;
    query2Domain:string;
    answerMode:boolean;
    error?:[number, string]; // server error (e.g. bad request)
}

export function errorUserConf(uiLanguages:{[code:string]:string}, error:[number, string], uiLang:string):UserConf {
    return {
        uiLanguages: uiLanguages,
        uiLang: uiLang,
        queries: [],
        queryType: QueryType.SINGLE_QUERY,
        query1Domain: '',
        query2Domain: '',
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
    lineChartColor1:string;
    lineConfidenceAreaColor1:string;
    lineChartColor2:string;
    lineConfidenceAreaColor2:string;
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


export interface LayoutVisibleTile {

    tile:string;

    width:number;

    readDataFrom?:string;

    ref?:string;
}


export interface GroupLayoutConfig {
    groupLabel?:LocalizedConfMsg;
    groupDescURL?:LocalizedConfMsg;
    groupTemplate?:any; // TODO unfinished concept
    tiles:Array<LayoutVisibleTile>;
}

export type GroupItemConfig = GroupLayoutConfig|string;

export interface LayoutConfigCommon {
    mainPosAttr:MainPosAttrValues;
    groups:Array<GroupItemConfig>;
    label?:LocalizedConfMsg;
    useLayout?:string;
    replace?:{[ref:string]:string};
    insertAfter?:{[ref:string]:Array<{tile:string; width:number}>};
}

export interface LayoutConfigSingleQuery extends LayoutConfigCommon {}

export interface LayoutConfigCmpQuery extends LayoutConfigCommon {}


export interface LayoutConfigTranslatQuery extends LayoutConfigCommon {
    targetDomains:Array<string>;
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
    footer?:{[lang:string]:string|{file:string}};
}

export interface FaviconConf {
    contentType:string;
    url:string;
}

export interface LogoConf {
    url:string;
    inlineStyle?:CSSProperties;
    label?:string;
}

export interface CommonTextStructures {
    sentence?:string;
    paragraph?:string;
    document?:string;
}

export interface DataReadabilityMapping {
    metadataMapping:{
        [corp:string]:{[key:string]:LocalizedConfMsg}
    };
    commonStructures:{[corp:string]:CommonTextStructures};
};

/**
 * Client side app configuration as present in wdglance.json
 * configuration file.
 */
export interface ClientStaticConf {
    rootUrl:string;
    hostUrl:string;
    runtimeAssetsUrl:string;
    favicon?:FaviconConf;
    logo?:LogoConf;
	corpInfoApiUrl:string;
    dataReadability?:DataReadabilityMapping|string;
    apiHeaders:{[urlPrefix:string]:HTTPHeaders};
    onLoadInit?:Array<string>;
    issueReportingUrl?:string;
    maxTileErrors:number;
    homepage:HomepageConfI18n;
    htmlTitle?:{[lang:string]:string};
    colors?:ColorsConf|string;
    searchDomains:{[domain:string]:string};

    // A list of URLs used to style specific content (e.g. HTML tiles)
    externalStyles?:Array<string>;

    /**
     * This specifies an URL used by the DataStreaming class
     * to start an EventSource stream. The fact whether it will
     * be used or not is given solely by tiles configuration.
     * I.e. if there will be no tile with `useDataStreaming` set
     * to true, then it does not matter whether this value
     * is filled or not.
     */
    dataStreamingUrl?:string;

    // If string we expect this to be a fs path to another
    // JSON file containing just the 'tiles' configuration
    tiles:MultiSourceTileConf;

    // If string we expect this to be a fs path to another
    // JSON file containing just the 'layout' configuration.
    layouts:DomainLayoutsConfig|string;

    telemetry?:{
        sendIntervalSecs:number;
        participationProbability:number;
        url?:string;
    };
}

/**
 * These types are necessary to create config schemata
 * using Makefile for tiles and layouts only
 */
export interface DomainLayoutsConfig {[domain:string]:LayoutsConfig};

export interface DomainAnyTileConf {[domain:string]:{[ident:string]:TileConf}};

export interface TileDbConf {
    server:string; // e.g. http://foo:5984
    db:string;
    prefix:string; // e.g. 'cnc:wag-test'
    username:string;
    password:string; // please do not use admin credentials for this
}

export function isTileDBConf(tiles: TileDbConf|DomainAnyTileConf):tiles is TileDbConf {
    return (tiles as TileDbConf).server !== undefined;
}

type MultiSourceTileConf = DomainAnyTileConf|string|TileDbConf;


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
    runtimeAssetsUrl:string;
    favicon?:FaviconConf;
	corpInfoApiUrl:string;
    dataReadability?:DataReadabilityMapping;
    logo?:LogoConf;
    colors?:ColorTheme;
    colorThemes:Array<ColorThemeIdent>;
    onLoadInit?:Array<string>;
    apiHeaders:{[urlPrefix:string]:HTTPHeaders};
    issueReportingUrl?:string;
    homepage:{
        tiles:Array<HomepageTileConf>;
        footer?:string;
    };
    tiles:{[ident:string]:TileConf};

    dataStreamingUrl:string;

    layouts:LayoutsConfig;
    searchDomains:Array<SearchDomain>;
    externalStyles:Array<string>;
    maxTileErrors:number;
    error?:Error;
    telemetry?:{
        sendIntervalSecs:number;
        participationProbability:number;
        url?:string;
    };
    maxQueryWords:{[k in QueryType]?:number};
}

export function emptyLayoutConf():LayoutsConfig {
    return {
        single: {
            groups: [],
            mainPosAttr: 'pos'
        },
        cmp: {
            groups: [],
            mainPosAttr: 'pos'
        },
        translat: {
            groups: [],
            targetDomains: [],
            mainPosAttr: 'pos'
        }
    };
}

export function mergeToEmptyLayoutConf(other:LayoutsConfig):LayoutsConfig {
    const layout = emptyLayoutConf();
    return {
        single: {...layout.single, ...other.single},
        cmp: {...layout.cmp, ...other.cmp},
        translat: {...layout.translat, ...other.translat}
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
        if (!ans) {
            throw new Error('Color theme misconfiguration - no default found');
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
        }))
    );
}

export function emptyClientConf(conf:ClientStaticConf, themeId:string|undefined):ClientConf {
    return {
        rootUrl: conf.rootUrl,
        hostUrl: conf.hostUrl,
        runtimeAssetsUrl: conf.runtimeAssetsUrl,
        favicon: conf.favicon,
        logo: conf.logo,
        corpInfoApiUrl: conf.corpInfoApiUrl,
        apiHeaders: conf.apiHeaders,
        dataReadability: {
            metadataMapping: {},
            commonStructures: {}
        },
        onLoadInit: conf.onLoadInit || [],
        colors: getAppliedThemeConf(conf, themeId),
        colorThemes: getThemeList(conf),
        dataStreamingUrl: undefined,
        tiles: {},
        layouts: emptyLayoutConf(),
        homepage: {
            tiles: []
        },
        searchDomains: Object.keys(conf.searchDomains).map(k => ({
            code: k,
            label: conf.searchDomains[k],
            queryTypes: []
        })),
        externalStyles: [],
        maxTileErrors: 0,
        maxQueryWords: {}
    };
}

export function getSupportedQueryTypes(conf:ClientStaticConf, domain:string):Array<QueryType> {
    if (typeof conf.layouts === 'string') {
        return [];
    }
    const layout = conf.layouts[domain] || emptyLayoutConf();
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
    sourceInfoUsername?:string;
    sourceInfoPassword?:string;
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

    korpusDBCrit?:string;
    korpusDBNgramCrit?:string;
    korpusDBNorm?:string;
}

export interface FreqDbConf {
    dbType:string;
    path:string;
    corpusSize:number;
    options?:FreqDbOptions;
}

export interface QueryModeWordDb {
    maxQueryWords:number;
    minLemmaFreq:number;
    databases:{[domain:string]:FreqDbConf};
};

export interface SingleModeWordDb extends QueryModeWordDb {
    similarFreqWordsMaxCtx:number;
}

export interface WordFreqDbConf {
    single?:SingleModeWordDb;
    cmp?:QueryModeWordDb;
    translat?:QueryModeWordDb;
}

export interface LangCookieSetup {
    name:string;
    domain?:string;
}

export interface GroupedAuth {
    ident:string;
    preflightUrl?:string;
    authenticateUrl:string;
    token:string;
    cookieName:string;
    cookieDomain:string;
}

/**
 * Server side app configuration.
 */
export interface ServerConf {
    address:string;
    port:number;
    distFilesUrl:string; // this ensures Webpack to resolve dynamic imports properly
    languages:{[code:string]:string};
    develServer:{
        port:number;
        urlRootPath:string;
    };
    freqDB:WordFreqDbConf;
    logQueue?:LogQueueConf;
    toolbar:ToolbarDef;
    langCookie?:LangCookieSetup;
    telemetryDB?:string;
    logging:{
        path?:string;
        rotation?:boolean;
    };
    sessions?:{
        path?:string;
        ttl?:number;
        secret?:string;
    };
    groupedAuth?:Array<GroupedAuth>;
    CSPDomains?:Array<string>;
}

export function getQueryTypeFreqDb(conf:ServerConf, queryType:QueryType):QueryModeWordDb {
    switch (queryType) {
        case QueryType.SINGLE_QUERY:
            return conf.freqDB.single || {minLemmaFreq: 0, databases: {}, similarFreqWordsMaxCtx: 0, maxQueryWords: 1};
        case QueryType.CMP_QUERY:
            return conf.freqDB.cmp || {minLemmaFreq: 0, databases: {}, maxQueryWords: 1};
        case QueryType.TRANSLAT_QUERY:
            return conf.freqDB.translat || {minLemmaFreq: 0, databases: {}, maxQueryWords: 1};
        default:
            throw new Error(`Unknown query type ${queryType}`);
    }
}
