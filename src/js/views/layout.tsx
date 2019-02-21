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
import {ActionDispatcher, ViewUtils} from 'kombo';
import * as React from 'react';
import { ClientConf, UserConf } from '../common/conf';
import {init as mainViewInit} from './main';
import { GlobalComponents } from './global';
import { TileGroup } from '../layout';


export interface LayoutProps {
    config:ClientConf;
    userConfig:UserConf;
}


export function init(dispatcher:ActionDispatcher, ut:ViewUtils<GlobalComponents>):React.SFC<LayoutProps> {

    const mainViews = mainViewInit(dispatcher, ut, null, null, null);

    const Layout:React.SFC<LayoutProps> = (props) => {

        const createScriptStr = () => {
            return `indexPage.init(document.querySelector('.wdglance-mount'),
                ${JSON.stringify({
                    uiLang: props.userConfig.uiLang,
                    query1Lang: props.userConfig.query1Lang,
                    query2Lang: props.userConfig.query2Lang,
                    query1: props.userConfig.query1,
                    query2: props.userConfig.query2,
                    queryType: props.userConfig.queryType,
                    rootUrl: props.config.rootUrl,
                    hostUrl: props.config.hostUrl,
                    corpInfoApiUrl: props.config.corpInfoApiUrl,
                    layouts: props.config.layouts,
                    tilesConf: props.userConfig.tilesConf,
                    dbValuesMapping: props.config.dbValuesMapping,
                    colors: props.config.colors
                })});`
        };

        return (
            <html>
                <head>
                    <meta charSet="utf-8" />
                    <meta name="viewport" content="width=device-width, initial-scale=1" />
                    <link href="./dist/index.css" rel="stylesheet" type="text/css" />
                    <link rel="stylesheet" type="text/css" href="//fonts.googleapis.com/css?family=Droid+Sans+Mono%7CRoboto:100,400,400italic,700,700italic%7CRoboto+Condensed:400,700&amp;subset=latin,latin-ext" media="all" />
                    <link rel="stylesheet" type="text/css" href="https://fonts.googleapis.com/css?family=Special+Elite" media="all"/>
                    <link rel="stylesheet" type="text/css" href="https://www.korpus.cz/vendor/webmodel/ui/style.css?v=1509638045" />
                    <link rel="stylesheet" type="text/css" href="//utils.korpus.cz/cdn/czcorpus/styles/1.0.0/main.css" />
                    <link rel="stylesheet" type="text/css" href="https://www.korpus.cz/css/toolbar.css?v=1509638060" />
                    <link rel="stylesheet" type="text/css" href="https://utils.korpus.cz/cdn/czcorpus/styles/1.0.0/main.css" />
                </head>
                <body>
                    <header className="wdg-header">
                        <h1>Word At a Glance</h1>
                    </header>
                    <section className="wdglance-mount">
                        <mainViews.WdglanceMain layout={Immutable.List<TileGroup>()} isMobile={false} />
                    </section>
                    <script type="text/javascript" src="./dist/common.js"></script>
                    <script type="text/javascript" src="./dist/index.js"></script>
                    <script type="text/javascript" dangerouslySetInnerHTML={{__html: createScriptStr()}} />
                </body>
            </html>
        );
    }

    return Layout;
}
