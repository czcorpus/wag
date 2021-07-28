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
import grooveBg from '../../../../assets/groovepaper2.jpg';

// ---------------- <GlobalStyle /> --------------------------------------

export const GlobalStyle = createGlobalStyle<{createStaticUrl: (file: string) => string}>`

    body {
        font-family: ${theme.defaultFontFamily};
        font-size: 1em;
        background-image: url(${grooveBg});

        > header.wdg-header {

            text-align: center;
            margin-top: 1.2em;

            a {
                display: inline-block;
                margin: 0;
                text-decoration: none;

                img {
                    width: 25em;
                }
            }
        }

        .wdglance-mount {
            max-width: 1550px;
            margin: 0 auto;
        }
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
                content: '\\00a0|\\00a0'
            }
        }
    }

    .tile-body {
        padding: 1.35em;
        text-align: justify;
        line-height: 1.6;
    }

    .tile-body.text,
    .cnc-tile-body.text {

        .raw-html {

            em {
                color: ${theme.colorLogoPink};
            }

            a {
                color: ${theme.colorLogoBlue};
            }

            a:hover {
                text-decoration: none;
            }

            img {
                width: 1em;
                display: inline-block;
                margin-left: 0em;
                margin-right: 0.1em;
            }
        }
    }

    #modal-overlay .cnc-tile-body.text .raw-html {
        font-size: 1.2em;
        max-width: 32em;
    }

    // -------

    .cnc-tile {
        border-radius: .25em;
        box-shadow: .05em .05em .15em .05em rgba(0, 0, 0, 0.2);
        background-color: white;
        font-size: .92em;
        color: #333;
    }

    .cnc-tile.highlighted {
        box-shadow: .09em .09em .15em .09em rgba(226, 0, 122, 0.7);
    }


    .cnc-tile-body {
        font-size: .9em;
        padding: 1.25em;
        height: 100%;
    }

    .cnc-tile-body a {
        color: #009ee0;
        text-decoration: none;
    }

    .cnc-tile-body a:hover {
        /*color: #007db1;*/
        text-decoration: underline;
    }

    .cnc-tile-body.error .message,
    .cnc-tile-body.empty .message {
        display: flex;
        align-items: center;
        align-content: center;

        p {
            font-size: 1.1em;
        }

        .MessageStatusIcon {
            margin-right: 1.3em;

            img {
                width: 1.7em;
                display: block;
            }
        }
    }

    .cnc-tile-body.error .report {
        font-size: 1.2em;
        text-align: center;
    }

    .cnc-tile-header {
        padding: .625em 1.25em;
        border-bottom: .1em solid rgba(0,0,0, 0.1);
    }

    /*
    * cnc-form
    * cnc-button
    */
    .cnc-form fieldset {
        margin: 0;
        padding: 1em 0;
        border: 0;
    }

    .cnc-form legend {
        border-bottom: .1em solid rgba(0,0,0, 0.1);
        display: block;
        width: 100%;
        font-size: 1.25em;
        padding: .4em 0;
        margin: 0;
    }

    /*
    * We intentionally use specifictity hack here, so that this rule
    * doesn't get overriden by e.g.: .cnc-tile a { ... }
    * This is preferred over !important
    */
    .cnc-button.cnc-button,
    .cnc-form input[type=text],
    .cnc-form input[type=password],
    .cnc-form input[type=number],
    .cnc-form input[type=email],
    .cnc-form textarea,
    .cnc-form select {
        padding: .4em .5em;
        border: .07em solid rgba(0,0,0, .2);
        border-radius: .3em;
        font-size: 1em;
        box-sizing: border-box;
    }

    .cnc-form input[type=text],
    .cnc-form input[type=password],
    .cnc-form input[type=number],
    .cnc-form input[type=email],
    .cnc-form textarea,
    .cnc-form select {
        background-color: white;
    }

    .cnc-form.cnc-form-spaced input[type=text],
    .cnc-form.cnc-form-spaced input[type=password],
    .cnc-form.cnc-form-spaced input[type=number],
    .cnc-form.cnc-form-spaced input[type=email],
    .cnc-form.cnc-form-spaced select {
        margin-top: .3em;
        margin-bottom: .7em;
    }

    .cnc-form.cnc-form-spaced label {
        vertical-align: middle;
    }

    .cnc-button.cnc-button {
        background-color: #E7E7E7;
        box-shadow: 0 -0.1em 0 0 rgba(0,0,0, .25) inset;
        padding-left: .7em;
        padding-right: .7em;
        color: #333;
    }

    .cnc-button.cnc-button:hover {
        background-color: #EFEFEF;
        border-color: rgba(0,0,0, .35);
        cursor: pointer;
    }

    .cnc-button.cnc-button:active,
    .cnc-button.cnc-button:focus,
    .cnc-form input[type=text]:focus,
    .cnc-form input[type=password]:focus,
    .cnc-form input[type=number]:focus,
    .cnc-form input[type=email]:focus,
    .cnc-form textarea:focus,
    .cnc-form select:focus {
        border-color: #009ee0;
    }

    a.cnc-button.cnc-button {
        display: inline-block;
    }

    a.cnc-button.cnc-button,
    a.cnc-button.cnc-button:hover {
        text-decoration: none;
    }

    .cnc-button.cnc-button-primary {
        background-color: #009ee0;
        color: white;
    }

    .cnc-button.cnc-button-primary:hover {
        background-color: #22ACE6;
    }

    .cnc-button.cnc-button-primary:focus,
    .cnc-button.cnc-button-primary:active {
        border-color: rgba(0,0,0, .75);
    }

    .cnc-button-text {
        font-size: 1.2em;
    }

    .cnc-button-desc {
        color: rgba(0,0,0, .5);
    }


    ${theme.media.medium} {

        body {
            > header.wdg-header {

                text-align: center;
                margin-top: 0.4em;
                margin-bottom: 0.6em;

                a {
                    display: inline-block;
                    margin: 0;
                    text-decoration: none;

                    img {
                        width: 18em;
                    }
                }
            }
        }

        .tile-body.text,
        .cnc-tile-body.text {
            max-width: 50em;
        }
    }

    ${theme.media.small} {

        body > header.wdg-header a img {
            width: 15em;
        }
    }

`;