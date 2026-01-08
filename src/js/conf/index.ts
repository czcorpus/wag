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
import { QueryType } from '../query/index.js';
import { TileConf } from '../page/tile.js';
import { List, pipe } from 'cnc-tskit';
import { ColorsConf, ColorTheme, ColorThemeIdent } from './theme.js';

export const DEFAULT_WAIT_FOR_OTHER_TILES = 60;

export const THEME_COOKIE_NAME = 'wag_theme';

export const LAST_USED_TRANSLAT_LANG_COOKIE_NAME = 'wag_last_translat_lang';

export type MainPosAttrValues = 'pos' | 'upos';

export interface UserQuery {
    word: string;
    pos: Array<string>;
    lemma?: string;
    sublemma?: string;
}

/**
 * A page configuration based on
 * user specific information/input.
 */
export interface UserConf {
    applicationId: string;
    uiLanguages: { [code: string]: string };
    uiLang: string;
    queries: Array<UserQuery>;
    queryType: QueryType;
    translatLanguage: string | undefined;
    answerMode: boolean;
    staticPage?: boolean;
    error?: [number, string]; // server error (e.g. bad request)
}

export function errorUserConf(
    applicationId: string,
    uiLanguages: { [code: string]: string },
    error: [number, string],
    uiLang: string
): UserConf {
    return {
        applicationId,
        uiLanguages,
        uiLang,
        queries: [],
        queryType: QueryType.SINGLE_QUERY,
        translatLanguage: '',
        answerMode: false, // ??
        staticPage: false,
        error,
    };
}

export interface LayoutVisibleTile {
    tile: string;

    width: number;

    readDataFrom?: string;

    ref?: string;
}

export interface GroupLayoutConfig {
    groupLabel?: LocalizedConfMsg;
    groupDescURL?: LocalizedConfMsg;
    groupTemplate?: any; // TODO unfinished concept
    tiles: Array<LayoutVisibleTile>;
}

export interface LayoutConfigCommon {
    mainPosAttr: MainPosAttrValues;
    groups: Array<GroupLayoutConfig>;
    label?: LocalizedConfMsg;
    useLayout?: string;
    replace?: { [ref: string]: string };
    insertAfter?: { [ref: string]: Array<{ tile: string; width: number }> };
}

export interface LayoutConfigSingleQuery extends LayoutConfigCommon {}

export interface LayoutConfigCmpQuery extends LayoutConfigCommon {}

export interface TranslatLanguage {
    code: string;
    label: string;
}

export interface LayoutConfigTranslatQuery extends LayoutConfigCommon {
    targetLanguages: Array<TranslatLanguage>;
}

export interface LayoutConfigPreviewQuery extends LayoutConfigCommon {
    targetLanguages: Array<TranslatLanguage>;
}

export interface LayoutsConfig {
    single?: LayoutConfigSingleQuery;
    cmp?: LayoutConfigCmpQuery;
    translat?: LayoutConfigTranslatQuery;
    preview?: LayoutConfigPreviewQuery;
}

export interface HomePageTileConfI18n {
    label: { [lang: string]: string };
    isFooterIntegrated?: boolean;
    contents: { [lang: string]: string | { file: string } };
}

export interface HomepageConfI18n {
    tiles: Array<HomePageTileConfI18n>;
    footer?: { [lang: string]: string | { file: string } };
}

export interface FaviconConf {
    contentType: string;
    url: string;
}

export interface InstanceLink {
    label: LocalizedConfMsg;
    url: string;
}

export interface LogoStaticConf {
    url: LocalizedConfMsg;
    inlineStyleDesktop?: LocalizedConfMsg;
    inlineStyleMobile?: LocalizedConfMsg;
    label?: LocalizedConfMsg;

    /**
     * For WaG instances displaying specific text type / media / etc.,
     * an additional logo can be used to display something like e.g.:
     * [Word at a Glance] [ / Fiction].
     */
    subWag?: {
        url: LocalizedConfMsg; // for different language versions, use object
        inlineStyleDesktop?: LocalizedConfMsg;
        inlineStyleMobile?: LocalizedConfMsg;
        label?: LocalizedConfMsg; // for different language versions, use object
    };
}

/**
 * LogoRuntimeConf represents a runtime version
 * of the LogoStaticConf (i.e. once we know ui language)
 */
export interface LogoRuntimeConf {
    url: string;
    inlineStyleDesktop: string;
    inlineStyleMobile: string;
    label: string;

    /**
     * For WaG instances displaying specific text type / media / etc.,
     * an additional logo can be used to display something like e.g.:
     * [Word at a Glance] [ / Fiction].
     */
    subWag?: {
        url: string;
        inlineStyleDesktop: string;
        inlineStyleMobile: string;
        label: string;
    };
}

export interface DataReadabilityMapping {
    [corp: string]: { [key: string]: LocalizedConfMsg };
}

/**
 * Client side app configuration as present in wdglance.json
 * configuration file.
 */
export interface ClientStaticConf {
    import?: string; // if present, then this is a path to another JSON file
    applicationId: string;
    rootUrl: string;
    hostUrl: string;
    runtimeAssetsUrl: string;
    favicon?: FaviconConf;
    logo?: LogoStaticConf;
    instanceSwitchMenu?: Array<InstanceLink> | string;
    hideUnavailableQueryTypes?: boolean;
    dataReadability?: DataReadabilityMapping | string;
    apiHeaders: { [urlPrefix: string]: HTTPHeaders };
    onLoadInit?: Array<string>;
    issueReportingUrl?: string;
    maxTileErrors: number;
    homepage: HomepageConfI18n;
    htmlTitle?: { [lang: string]: string };
    colors?: ColorsConf | string;

    // A list of URLs used to style specific content (e.g. HTML tiles)
    externalStyles?: Array<string>;

    /**
     * This specifies an URL used by the DataStreaming class
     * to start an EventSource stream. The fact whether it will
     * be used or not is given solely by tiles configuration.
     * I.e. if there will be no tile with `useDataStreaming` set
     * to true, then it does not matter whether this value
     * is filled or not.
     */
    dataStreamingUrl: string;

    // If string we expect this to be a fs path to another
    // JSON file containing just the 'tiles' configuration
    tiles: MultiSourceTileConf;

    // If string we expect this to be a fs path to another
    // JSON file containing just the 'layout' configuration.
    layouts: LayoutsConfig | string;
}

export interface TileDbConf {
    server: string; // e.g. http://foo:5984
    appId: string;
    username: string;
    password: string; // please do not use admin credentials for this
}

export interface AllQueryTypesTileConf {
    [qType: string]: TileConf;
}

type MultiSourceTileConf = string | TileDbConf | AllQueryTypesTileConf;

export function isTileDBConf(tiles: MultiSourceTileConf): tiles is TileDbConf {
    return (tiles as TileDbConf).server !== undefined;
}

export interface HomepageTileConf {
    label: string;
    html: string;
    isFooterIntegrated: boolean;
}

/**
 * Client side app configuration as generated
 * for a specific session (e.g. with tiles for
 * specific query type).
 */
export interface ClientConf {
    rootUrl: string;
    hostUrl: string;
    runtimeAssetsUrl: string;
    favicon?: FaviconConf;
    dataReadability?: DataReadabilityMapping;
    logo?: LogoRuntimeConf;
    instanceSwitchMenu?: Array<{ label: string; url: string }>;
    hideUnavailableQueryTypes?: boolean;
    colors?: ColorTheme;
    colorThemes: Array<ColorThemeIdent>;
    onLoadInit?: Array<string>;
    apiHeaders: { [urlPrefix: string]: HTTPHeaders };
    issueReportingUrl?: string;
    homepage: {
        tiles: Array<HomepageTileConf>;
        footer?: string;
    };
    tiles: { [ident: string]: TileConf };
    dataStreamingUrl: string;

    layouts: LayoutsConfig;
    queryTypes: Array<QueryType>;
    externalStyles: Array<string>;
    maxTileErrors: number;
    error?: Error;
    redirect?: [number, string];
    maxQueryWords: number;
}

export function emptyLayoutConf(): LayoutsConfig {
    return {
        single: {
            groups: [],
            mainPosAttr: 'pos',
        },
        cmp: {
            groups: [],
            mainPosAttr: 'pos',
        },
        translat: {
            groups: [],
            targetLanguages: [],
            mainPosAttr: 'pos',
        },
    };
}

export function mergeToEmptyLayoutConf(other: LayoutsConfig): LayoutsConfig {
    const layout = emptyLayoutConf();
    return {
        single: { ...layout.single, ...other.single },
        cmp: { ...layout.cmp, ...other.cmp },
        translat: { ...layout.translat, ...other.translat },
        preview: { ...layout.preview, ...other.preview },
    };
}

export function getAppliedThemeConf(
    conf: ClientStaticConf,
    themeId?: string
): ColorTheme | undefined {
    let ans: ColorTheme;
    const colors = conf.colors;
    if (typeof colors === 'object') {
        if (themeId) {
            ans = List.find((t) => t.themeId === themeId, colors.themes);
        }
        if (!ans) {
            ans = List.find((t) => t.themeId === colors.default, colors.themes);
        }
        if (!ans) {
            throw new Error('Color theme misconfiguration - no default found');
        }
    }
    return ans;
}

export function getThemeList(conf: ClientStaticConf): Array<ColorThemeIdent> {
    return pipe(
        typeof conf.colors === 'string' ? [] : conf.colors.themes,
        List.map((v) => ({
            themeId: v.themeId,
            themeLabel: v.themeLabel ? v.themeLabel : v.themeId,
            description: v.description,
        }))
    );
}

export function emptyClientConf(
    conf: ClientStaticConf,
    themeId: string | undefined
): ClientConf {
    return {
        rootUrl: conf.rootUrl,
        hostUrl: conf.hostUrl,
        runtimeAssetsUrl: conf.runtimeAssetsUrl,
        favicon: conf.favicon,
        logo: {
            url: '',
            inlineStyleDesktop: '',
            inlineStyleMobile: '',
            label: '',
        },
        apiHeaders: conf.apiHeaders,
        dataReadability: {
            metadataMapping: {},
            commonStructures: {},
        },
        onLoadInit: conf.onLoadInit || [],
        colors: getAppliedThemeConf(conf, themeId),
        colorThemes: getThemeList(conf),
        dataStreamingUrl: undefined,
        tiles: {},
        layouts: emptyLayoutConf(),
        homepage: {
            tiles: [],
        },
        queryTypes: [],
        externalStyles: [],
        maxTileErrors: 0,
        maxQueryWords: 1,
    };
}

export function getSupportedQueryTypes(
    conf: ClientStaticConf,
    translatLang: string
): Array<QueryType> {
    if (typeof conf.layouts === 'string') {
        return [];
    }
    const layout = conf.layouts[translatLang] || emptyLayoutConf();
    const ans: Array<QueryType> = [];
    if (
        layout.single &&
        Array.isArray(layout.single.groups) &&
        layout.single.groups.length > 0
    ) {
        ans.push(QueryType.SINGLE_QUERY);
    }
    if (
        layout.translat &&
        Array.isArray(layout.translat.groups) &&
        layout.translat.groups.length > 0
    ) {
        ans.push(QueryType.TRANSLAT_QUERY);
    }
    if (
        layout.cmp &&
        Array.isArray(layout.cmp.groups) &&
        layout.cmp.groups.length > 0
    ) {
        ans.push(QueryType.CMP_QUERY);
    }
    return ans;
}

export interface ToolbarDef {
    type: string;
    url?: string;
}

export interface FreqDbOptions {
    urlArgs?: { [key: string]: string };
    httpHeaders?: { [key: string]: string };
    sourceInfoUrl?: string;
    sourceInfoUsername?: string;
    sourceInfoPassword?: string;
    username?: string;
    password?: string;

    /**
     * If N, then for any 1, 2,...,N-gram type, the database
     * is able to provide similar ARF frequency. I.e. it won't
     * mix e.g. 2-grams and 3-grams. If 0 or omitted then we assume that
     * we are not able to support such a feature and the datase
     * returns just any 1, 2,...N-grams matching entered
     * ARF. This is only supported for 1, 2, 3, 4-grams.
     */
    maxSingleTypeNgramArf?: number;

    korpusDBCrit?: string;
    korpusDBNgramCrit?: string;
    korpusDBNorm?: string;
}

export interface FreqDbConf {
    dbType: string;
    path: string;
    corpusSize: number;
    options?: FreqDbOptions;
}

export interface WordDbConf {
    maxQueryWords: number;
    minLemmaFreq: number;
    database: FreqDbConf;
    similarFreqWordsMaxCtx: number;
}

export interface LangCookieSetup {
    name: string;
    domain?: string;
}

export interface GroupedAuth {
    ident: string;
    preflightUrl?: string;
    authenticateUrl: string;
    token: string;
    cookieName: string;
    cookieDomain: string;
}

/**
 * Server side app configuration.
 */
export interface ServerConf {
    import?: string; // if present, then this is a path to another JSON file
    address: string;
    port: number;
    distFilesUrl: string; // this ensures Webpack to resolve dynamic imports properly
    languages: { [code: string]: string };
    develServer: {
        host: string;
        port: number;
        urlRootPath: string;
        webSocketURL?: string;
    };
    freqDB: WordDbConf;
    toolbar: ToolbarDef;
    langCookie?: LangCookieSetup;
    logging: {
        path?: string;
        rotation?: boolean;
    };
    sessions?: {
        path?: string;
        ttl?: number;
        secret?: string;
    };
    CSPDomains?: Array<string>;
}
