/*
 * Copyright 2018 Tomas Machalek <tomas.machalek@gmail.com>
 * Copyright 2018 Institute of the Czech National Corpus,
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

import { ViewUtils } from 'kombo';
import * as React from 'react';
import { resolve as urlResolve } from 'url';

import { HostPageEnv, AvailableLanguage } from '../common/hostPage';
import { RecognizedQueries } from '../common/query/index';
import { ClientConf, UserConf, ColorThemeIdent } from '../conf';
import { TileGroup } from '../layout';
import { GlobalComponents } from './global';
import { WdglanceMainProps } from './main';
import { ErrPageProps } from './error';
import { List } from 'cnc-tskit';



export interface LayoutProps {
    config:ClientConf;
    userConfig:UserConf;
    hostPageEnv:HostPageEnv;
    queryMatches:RecognizedQueries;
    uiLanguages:Array<AvailableLanguage>;
    homepageTiles:Array<{label:string; html:string}>;
    uiLang:string;
    returnUrl:string;
    themes:Array<ColorThemeIdent>;
    currTheme:string;
    RootComponent:React.ComponentType<WdglanceMainProps|ErrPageProps>;
    layout:Array<TileGroup>;
    homepageSections:Array<{label:string; html:string}>;
    isMobile:boolean;
    isAnswerMode:boolean;
    error:[number, string];
    version:string;
    repositoryUrl:string;
}


export function init(ut:ViewUtils<GlobalComponents>):React.SFC<LayoutProps> {

    // -------- <ThemeSelection /> -----------------------------

    const ThemeSelection:React.SFC<{
        themes:Array<ColorThemeIdent>;
        currTheme:string;
        returnUrl:string;

    }> = (props) => {
        return (
            <form className="ThemeSelection" method="post" action={ut.createActionUrl('set-theme')}>
                <input type="hidden" name="returnUrl" value={props.returnUrl} />
                <span>{ut.translate('global__color_themes')}:{'\u00a0'}
                {List.map((v, i) => (
                    <React.Fragment key={`theme:${v.themeId}`}>
                        {i > 0 ? ', ' : ''}
                        <button type="submit"  name="themeId" value={v.themeId}
                                className={v.themeId === props.currTheme ? 'current' : null}>{v.themeLabel}</button>
                    </React.Fragment>
                ), props.themes)}
                </span>
            </form>
        );
    }

    // -------- <Layout /> -----------------------------

    const Layout:React.SFC<LayoutProps> = (props) => {

        const createScriptStr = () => {
            return `indexPage.initClient(document.querySelector('.wdglance-mount'),
                ${JSON.stringify(props.config)}, ${JSON.stringify(props.userConfig)}, ${JSON.stringify(props.queryMatches)});`
        };

        const renderToolbar = () => {
            return typeof props.hostPageEnv.html === 'string' ?
                <div style={{height: props.hostPageEnv.toolbarHeight ? props.hostPageEnv.toolbarHeight : 'auto'}}
                                dangerouslySetInnerHTML={{__html: props.hostPageEnv.html}} /> :
                <div style={{height: props.hostPageEnv.toolbarHeight ? props.hostPageEnv.toolbarHeight : 'auto'}}>
                    <props.hostPageEnv.html languages={props.uiLanguages} uiLang={props.uiLang} returnUrl={props.returnUrl} />
                </div>;
        };

        return (
            <html lang={props.uiLang}>
                <head>
                    <meta charSet="utf-8" />
                    <meta name="viewport" content="width=device-width, initial-scale=1" />
                    <title>{ut.translate('global__wdglance_title')}</title>
                    <link href={`${urlResolve(props.config.hostUrl, 'dist/common.css')}`} rel="stylesheet" type="text/css" />
                    {props.config.favicon ? <link rel="icon" type={props.config.favicon.contentType} href={props.config.favicon.url} /> : null}
                    <link rel="stylesheet" type="text/css" href="//fonts.googleapis.com/css?family=Droid+Sans+Mono%7CRoboto:100,400,400italic,700,700italic%7CRoboto+Condensed:400,700&amp;subset=latin,latin-ext&amp;display=swap" media="all" />
                    {props.hostPageEnv.styles.concat(props.config.externalStyles).map(style =>
                       <link key={style} rel="stylesheet" type="text/css" href={style} media="all"/> )}
                </head>
                <body>
                    {props.hostPageEnv.html ? renderToolbar() : null}
                    <header className="wdg-header">
                        <a href={props.config.hostUrl} title={ut.translate('global__wdglance_title')}>
                            {props.config.logo ?
                                <img src={props.config.logo.url} alt="logo" style={props.config.logo.inlineStyle} /> :
                                <img src={ut.createStaticUrl(ut.translate('global__logo_file'))} alt="logo" />
                            }
                        </a>
                    </header>
                    <section className="wdglance-mount">
                        <props.RootComponent
                            layout={props.layout}
                            homepageSections={props.homepageSections}
                            isMobile={props.isMobile}
                            isAnswerMode={props.isAnswerMode}
                            error={props.error}
                             />
                    </section>
                    {props.hostPageEnv.scripts.map(script =>
                        <script key={script} type="text/javascript" src={script}></script>
                    )}
                    <script type="text/javascript" src={`${urlResolve(props.config.hostUrl, 'dist/common.js')}`}></script>
                    <script type="text/javascript" src={`${urlResolve(props.config.hostUrl, 'dist/index.js')}`}></script>
                    <script type="text/javascript" dangerouslySetInnerHTML={{__html: createScriptStr()}} />
                    <footer>
                        <section>
                            <ThemeSelection returnUrl={props.returnUrl} themes={props.themes} currTheme={props.currTheme} />
                        </section>
                        <section className="copy-etc">
                            {props.config.logo ?
                                <span><img src={ut.createStaticUrl('logo-small.svg')} className="logo" alt="WaG" /></span> :
                                null
                            }
                            <span>{ut.translate('global__powered_by_wag_{version}', {version: props.version})}
                                {'\u00a0'}
                                (<a href={props.repositoryUrl} target="_blank">{ut.translate('global__view_on_github')}</a>)
                            </span>
                            <span className="separ">|</span>
                            <span className="copy">
                                &copy; <a href="https://ucnk.ff.cuni.cz/" target="_blank">
                                    {ut.translate('global__institute_cnc')}
                                    </a>
                            </span>
                        </section>
                    </footer>
                </body>
            </html>
        );
    }

    return Layout;
}
