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
import * as Immutable from 'immutable';
import { ViewUtils } from 'kombo';
import * as React from 'react';
import { resolve as urlResolve } from 'url';

import { HostPageEnv, AvailableLanguage } from '../common/hostPage';
import { LemmaVariant } from '../common/query';
import { ClientConf, UserConf } from '../conf';
import { TileGroup } from '../layout';
import { GlobalComponents } from './global';
import { WdglanceMainProps } from './main';



export interface LayoutProps {
    config:ClientConf;
    userConfig:UserConf;
    hostPageEnv:HostPageEnv;
    lemmas:Array<LemmaVariant>;
    uiLanguages:Immutable.List<AvailableLanguage>;
    homepageTiles:Immutable.List<{label:string; html:string}>;
    uiLang:string;
    returnUrl:string;
    RootComponent:React.ComponentType<WdglanceMainProps>;
    layout:Immutable.List<TileGroup>;
    homepageSections:Immutable.List<{label:string; html:string}>;
    isMobile:boolean;
    isAnswerMode:boolean;
}


export function init(ut:ViewUtils<GlobalComponents>):React.SFC<LayoutProps> {

    const Layout:React.SFC<LayoutProps> = (props) => {

        const createScriptStr = () => {
            return `indexPage.initClient(document.querySelector('.wdglance-mount'),
                ${JSON.stringify(props.config)}, ${JSON.stringify(props.userConfig)}, ${JSON.stringify(props.lemmas)});`
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
                    <link rel="stylesheet" type="text/css" href="//fonts.googleapis.com/css?family=Droid+Sans+Mono%7CRoboto:100,400,400italic,700,700italic%7CRoboto+Condensed:400,700&amp;subset=latin,latin-ext" media="all" />
                    {props.hostPageEnv.styles.map(style =>
                       <link key={style} rel="stylesheet" type="text/css" href={style} media="all"/> )}
                </head>
                <body>
                    {props.hostPageEnv.html ? renderToolbar() : null}
                    <header className="wdg-header">
                        <a href={props.config.hostUrl} title={ut.translate('global__wdglance_title')}>
                            <img src={ut.createStaticUrl(ut.translate('global__logo_file'))} alt="logo" />
                        </a>
                    </header>
                    <section className="wdglance-mount">
                        <props.RootComponent
                            layout={props.layout}
                            homepageSections={props.homepageSections}
                            isMobile={props.isMobile}
                            isAnswerMode={props.isAnswerMode} />
                    </section>
                    {props.hostPageEnv.scripts.map(script =>
                        <script key={script} type="text/javascript" src={script}></script>
                    )}
                    <script type="text/javascript" src={`${urlResolve(props.config.hostUrl, 'dist/common.js')}`}></script>
                    <script type="text/javascript" src={`${urlResolve(props.config.hostUrl, 'dist/index.js')}`}></script>
                    <script type="text/javascript" dangerouslySetInnerHTML={{__html: createScriptStr()}} />
                </body>
            </html>
        );
    }

    return Layout;
}
