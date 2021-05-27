/*
 * Copyright (c) 2021 Charles University in Prague, Faculty of Arts,
 *                    Institute of the Czech National Corpus
 * Copyright (c) 2021 Martin Zimandl <martin.zimandl@gmail.com>
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation; version 2
 * dated June, 1991.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.

 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */

import { createGlobalStyle } from 'styled-components';
import * as theme from '../common/theme';

// ---------------- <GlobalStyle /> --------------------------------------

export const GlobalStyle = createGlobalStyle<{createStaticUrl: (file: string) => string}>`
    body {
        font-family: ${theme.defaultFontFamily};
        font-size: 1em;
        font-display: swap;
        background-image: url(${props => props.createStaticUrl('groovepaper2.jpg')});
    }

    input.invalid, textarea.invalid {
        border: 1px solid red;
    }

    table.data {
        margin: 0 auto;
        border-spacing: 0;
        border-collapse: collapse;

        tbody tr:nth-child(odd):not(.heading) {
            background-color: ${theme.colorWhitelikeBlue};
        }

        tr.top-grouped th {
            padding-top: 0;
            padding-bottom: 0;
        }

        tr.bottom-grouped th {
            padding-bottom: 0;
        }

        td, th {
            border: none;
            padding: 0.4em 0.9em;
        }

        td:not(:last-child), th:not(:last-child) {
            border-color: white;
            border-width: 0 2px 0 0;
            border-style: solid;
        }

        th {
            padding: 0.7em 0.7em;
        }

        th.separ:not(:last-child)  {
            border-color: #c0c0c0;
            border-width: 0 2px 0 0;
            border-style: solid;
        }
    }

    .num {
        text-align: right;
    }

    .note {
        color: ${theme.colorLightText};
    }

    footer {
        font-size: 0.9em;
        text-align: center;
        margin-top: 1.5em;
        color: ${theme.colorLightText};

        section {
            > span {
                border-style: solid;
                border-color: ${theme.colorLightText};
                border-width: 0 0 0 0.15em;
                padding-left: 0.4em;
                padding-right: 0.4em;
            }
        }

        section.links, section.project-info {
            display: inline-block;
        }

        section.project-info > span:first-child {
            border: none;
        }

        section.links > span:first-child {
            border-style: solid;
            border-color: ${theme.colorLightText};
            border-width: 0 0 0 0.15em;
        }

        a {
            color: ${theme.colorLightText};
            text-decoration: none;
        }

        .action a {
            color: ${theme.colorDefaultText};
        }

        a:hover {
            text-decoration: underline;
        }

        section:not(:last-child) {
            margin-bottom: 0.9em;
        }

        section {

            p {
                margin-bottom: 0;
            }

            img.logo {
                width: 3.1em;
                margin-right: 0.7em;
            }
        }
    }

    .ThemeSelection {
        display: block;
        color: ${theme.colorLightText};

        button {
            display: inline-block;
            border: none;
            background: none;
            cursor: pointer;
            margin: 0 0.1em;
            padding: 0;
            font-size: 1em;
        }

        button.current {
            color: ${theme.colorLogoBlue};
            cursor: default;
        }
    }

    .LangSwitchToolbar {
        color: ${theme.colorLightText};
        text-align: right;
        font-size: 0.9em;

        ul {
            list-style-type: none;
            margin: 0;

            li {
                margin: 0;
                padding: 0;
                display: inline-block;

                button {
                    border: none;
                    background-color: transparent;
                    cursor: pointer;
                    color: ${theme.colorLightText};
                    padding: 0 0.2em;
                }

                button:hover {
                    color: ${theme.colorLogoBlue};
                }

                button.current {
                    text-decoration: none;
                    border-style: solid;
                    border-width: 0 0 1px 0;
                    border-color: ${theme.colorLogoBlue};
                }
            }

            li:not(:last-child):after {
                content: '\00a0|\00a0'
            }
        }
    }

    ${theme.mediaSmallScreen} {
        body {
            margin: 0;
            padding: 0;

            .wdglance-mount {
                padding: 0 0.3em 0 0.3em;
            }
        }

        footer {

            margin-top: 0.4em;
            line-height: 1.5em;

            p {
                margin-bottom: 0;
            }

            .copy {
                padding-left: 0;
                display: block;
            }

            section.links > span:first-child {
                border: none;
            }

            section.project-info {

                margin-bottom: 0;

                span {
                    display: block;
                    border: none;
                }
            }
        }
    }
`;