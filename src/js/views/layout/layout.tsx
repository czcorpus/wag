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

import { HostPageEnv, AvailableLanguage } from '../../page/hostPage.js';
import { RecognizedQueries } from '../../query/index.js';
import { ClientConf, UserConf, ColorThemeIdent } from '../../conf/index.js';
import { TileGroup } from '../../page/layout.js';
import { GlobalComponents } from '../common/index.js';
import { WdglanceMainProps } from '../main.js';
import { ErrPageProps } from '../error.js';
import { List, pipe } from 'cnc-tskit';
import { Theme } from '../../page/theme.js';



export interface HtmlBodyProps {
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
    RootComponent:React.FC<WdglanceMainProps>|React.FC<ErrPageProps>;
    layout:Array<TileGroup>;
    homepageSections:Array<{label:string; html:string}>;
    isMobile:boolean;
    isAnswerMode:boolean;
    error:[number, string];
    version:string;
    repositoryUrl:string;
    scriptNonce:string;
    issueReportingUrl?:string;
}

export interface HtmlHeadProps {
    config:ClientConf;
    hostPageEnv:HostPageEnv;
    scStyles:Array<React.ReactElement>;
    htmlTitle?:string;
}


function marshalJSON(data:any):string {
    return JSON.stringify(data)
        .replace(/</g, '\\u003c')
        .replace(/>/g, '\\u003e')
        .replace(/'/g, '\\u0027');
}


export function init(
    ut:ViewUtils<GlobalComponents>,
    theme:Theme
):{
    HtmlBody:React.FC<HtmlBodyProps>;
    HtmlHead:React.FC<HtmlHeadProps>;
} {

    // -------- <ThemeSelection /> -----------------------------

    const ThemeSelection:React.FC<{
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
                                disabled={v.themeId === props.currTheme}
                                className={v.themeId === props.currTheme ? 'current' : null}>
                            {typeof v.themeLabel === 'string' ?
                                v.themeLabel :
                                v.themeLabel['en-US']
                            }
                        </button>
                    </React.Fragment>
                ), props.themes)}
                </span>
            </form>
        );
    }

    // --------- <ThemeMenu /> -------------------------

    const ThemeMenu:React.FC<{
        themes:Array<ColorThemeIdent>;
        returnUrl:string;
        currTheme:string;

    }> = (props) => (
        <section>
            {props.themes.length > 0 ?
            <ThemeSelection returnUrl={props.returnUrl} themes={props.themes} currTheme={props.currTheme} /> :
            null
            }
        </section>
    );

    // -------- <CustomFooter /> ----------------------

    const CustomFooter:React.FC<{
        config:ClientConf;
        returnUrl:string;
        themes:Array<ColorThemeIdent>;
        currTheme:string;
        repositoryUrl:string;
        version:string;

    }> = (props) => (
        <>
            <div dangerouslySetInnerHTML={{__html: props.config.homepage.footer}} />
            <ThemeMenu returnUrl={props.returnUrl} themes={props.themes} currTheme={props.currTheme} />
            <section className="project-info">
                <span>{ut.translate('global__powered_by_wag_{version}', {version: props.version})}</span>
                (<a target="_blank" rel="noopener" href={props.repositoryUrl}>{ut.translate('global__view_on_github')}</a>)
            </section>
        </>
    );

    // -------- <DefaultFooter /> ----------------------

    const DefaultFooter:React.FC<{
        config:ClientConf;
        returnUrl:string;
        themes:Array<ColorThemeIdent>;
        currTheme:string;
        repositoryUrl:string;
        version:string;
        issueReportingUrl:string;

    }> = (props) => (
        <>
            <ThemeMenu returnUrl={props.returnUrl} themes={props.themes} currTheme={props.currTheme} />
            <section className="project-info">
                <span className="copy">
                    &copy; <a href="https://ul.ff.cuni.cz/" target="_blank" rel="noopener">
                        {ut.translate('global__institute_cnc')}
                        </a>
                </span>
                {props.config.logo ?
                    <span><img className="filtered logo" src={ut.createStaticUrl('logo-small.svg')} alt="WaG installation logo" /></span> :
                    null
                }
                <span>{ut.translate('global__powered_by_wag_{version}', {version: props.version})}</span>
            </section>
            <section className="links">
                <span className="action">
                    <a target="_blank" rel="noopener" href={props.repositoryUrl}>{ut.translate('global__view_on_github')}</a>
                </span>
                {props.issueReportingUrl ?
                    <>
                        <span className="report-error action">
                            <a target="_blank" rel="noopener" href={props.issueReportingUrl}>{ut.translate('global__report_a_problem')}</a>
                        </span>
                    </> :
                    null
                }
            </section>
        </>
    );

    // -------- <HtmlHead /> -------------------------------

    const HtmlHead:React.FC<HtmlHeadProps> = (props) => {
        return (
            <head>
                <meta charSet="utf-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <meta name="description" content={ut.translate('global__meta_desc')} />
                <title>{props.htmlTitle ? props.htmlTitle : ut.translate('global__wdglance_title')}</title>
                {props.config.favicon ? <link rel="icon" type={props.config.favicon.contentType} href={props.config.favicon.url} /> : null}
                <link rel="stylesheet" type="text/css" href="//fonts.googleapis.com/css?family=Droid+Sans+Mono%7CRoboto:100,400,400italic,700,700italic%7CRoboto+Condensed:400,700&amp;subset=latin,latin-ext&amp;display=swap" media="all" />
                {pipe(
                    props.hostPageEnv.styles,
                    List.concat(props.config.externalStyles),
                    List.map(
                        style => <link key={style} rel="stylesheet" type="text/css" href={style} media="all"/>
                    )
                )}
                {[...props.scStyles]}
            </head>
        );
    }

    // -------- <HtmlBody /> -----------------------------

    const HtmlBody:React.FC<HtmlBodyProps> = (props) => {

        const createScriptStr = () => {
            return `indexPage.initClient(document.querySelector('.wdglance-mount'),
                ${marshalJSON(props.config)}, ${marshalJSON(props.userConfig)}, ${marshalJSON(props.queryMatches)});
            `
        };

        const renderToolbar = () => {
            return typeof props.hostPageEnv.html === 'string' ?
                <div style={{height: props.hostPageEnv.toolbarHeight ? props.hostPageEnv.toolbarHeight : 'auto'}}
                                dangerouslySetInnerHTML={{__html: props.hostPageEnv.html}} /> :
                <div style={{height: props.hostPageEnv.toolbarHeight ? props.hostPageEnv.toolbarHeight : 'auto'}}>
                    <props.hostPageEnv.html languages={props.uiLanguages} uiLang={props.uiLang} returnUrl={props.returnUrl} />
                </div>;
        };

        const createLabel = () => props.config.logo && props.config.logo.label ?
            props.config.logo.label :
            ut.translate('global__wdglance_title');

        return (
            <body>
                {props.hostPageEnv.html ? renderToolbar() : null}
                <header className="wdg-header">
                    <div className="logo-wrapper">
                        <a href={props.config.hostUrl} title={createLabel()}>
                            {props.config.logo?.url ?
                                <img className="logo-filtered" src={props.config.logo.url} alt="logo" style={props.config.logo?.inlineStyle} /> :
                                <img className="logo-filtered" src={ut.createStaticUrl(ut.translate('global__logo_file'))} alt="logo" />
                            }
                        </a>
                        {
                            props.config.logo.subWag ?
                                <a href={props.config.hostUrl}>
                                    <img src={props.config.logo.subWag.url} alt="logo" style={props.config.logo.subWag.inlineStyle} />
                                </a> :
                                null
                        }
                    </div>
                </header>
                <section className="wdglance-mount">
                    <props.RootComponent
                        layout={props.layout}
                        homepageSections={props.homepageSections}
                        isMobile={props.isMobile}
                        isAnswerMode={props.isAnswerMode}
                        queries={props.userConfig.queries}
                        error={props.error}
                        onMount={()=>undefined}
                            />
                </section>
                <footer>
                    {props.config.homepage.footer ?
                        <CustomFooter config={props.config} returnUrl={props.returnUrl}
                                repositoryUrl={props.repositoryUrl} themes={props.themes}
                                currTheme={props.currTheme} version={props.version} /> :
                        <DefaultFooter config={props.config} returnUrl={props.returnUrl}
                                repositoryUrl={props.repositoryUrl} themes={props.themes}
                                currTheme={props.currTheme} version={props.version}
                                issueReportingUrl={props.issueReportingUrl} />
                    }
                </footer>
                {props.hostPageEnv.scripts.map(script =>
                    <script key={script} type="text/javascript" src={script}></script>
                )}
                <script type="text/javascript" src={`${urlResolve(props.config.hostUrl, 'dist/common.js')}`}></script>
                <script type="text/javascript" src={`${urlResolve(props.config.hostUrl, 'dist/index.js')}`}></script>
                <script nonce={props.scriptNonce} type="text/javascript" dangerouslySetInnerHTML={{__html: createScriptStr()}} />
            </body>
        );
    }

    return {HtmlBody, HtmlHead};
}
