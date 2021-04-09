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

import styled from 'styled-components';
import { createGlobalStyle } from 'styled-components';
import * as theme from './theme';

// ---------------- <GlobalStyle /> --------------------------------------

export const GlobalStyle = createGlobalStyle`
    body {
        font-family: ${theme.defaultFontFamily};
        font-size: 1em;
        font-display: swap;
        background-image: ${theme.mainBackground};
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

// ---------------- <AjaxLoader /> --------------------------------------

export const AjaxLoader = styled.img`
    &.centered {
        display: block;
        margin: 2em auto 2em auto;
    }
`;

// ---------------- <TileWrapper /> --------------------------------------

export const TileWrapper = styled.div`
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    height: 100%;

    .loader-wrapper {
        height: 0.2em;
    }

    .content {
        font-size: .9em;
        padding: 1.25em;

        .tweak-box {
            margin-bottom: 1.5em;
        }
    }

    .source {
        font-size: .9em;
        padding: 1.25em;
        color: ${theme.colorLightText};

        a {
            cursor: pointer;
            text-decoration: none;
            color: ${theme.colorLogoBlue};
        }

        a:hover {
            text-decoration: underline;
        }
    }

    .empty {

        .not-applicable-box {
            height: 100%;
            display: flex;
            flex-direction: column;

            p.not-applicable {
                display: flex;
                flex-grow: 1;
                margin: 0;
                color: ${theme.colorSuperlightGrey};
                font-size: 9em;
                text-align: center;
                justify-content: center;
                align-items: center;

                span {

                }
            }
        }
    }

    hr {
        border: none;
        height: 2px;
        color: ${theme.colorWhitelikeBlue};
        background-color: ${theme.colorWhitelikeBlue};
    }
`;

// ---------------- <TileWrapper /> --------------------------------------

export const TitleLoaderBar = styled.div`
    @keyframes slidein {
        0% {
            transform: translate(0);
        }
        100% {
            transform: translate(220%);
        }
    }

    animation: slidein 3s linear 0s infinite running;

    .grad {
        position: relative;
        margin-left: -110%;
        width: 100%;
        height: 0.2em;
        background: linear-gradient(0.25turn, #ffffff, ${theme.colorLogoPink}, #ffffff);
    }
`;

// ---------------- <HorizontalBlockSwitch /> --------------------------------------

export const HorizontalBlockSwitch = styled.div`
    padding-top: 0.3em;
    padding-top: 0.3em;
    text-align: center;

    a {
        color: ${theme.colorLogoBlue};
        cursor: pointer;
        font-size: 2em;
        padding: 0.2em;
        display: inline-block;
    }

    a:hover {
        text-decoration: none;
    }

    a.current {
        color: ${theme.colorLogoBlueShining};
    }
`;

// ---------------- <TileReloadControl /> --------------------------------------

export const TileReloadControl = styled.p`
    text-align: center;

    a {
        cursor: pointer;
        font-size: 1.5em;
    }
`;

// ---------------- <TileReloadControl /> --------------------------------------

export const ResponsiveWrapper = styled.div`
    width: 100%;
    height: 100%;
    min-width: ${props => props.minWidth ? props.minWidth : 'auto'};
`;

// ---------------- <ModalOverlay /> --------------------------------------

export const ModalOverlay = styled.div`
    position: fixed;
    z-index: 10000;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    background-color: hsla(0,0%,8%,.7);

    .box {
        position: absolute;
        top: 30%;
        left: 50%;
        transform: translate(-50%,-30%);
        max-height: 100%;

        header span:first-letter {
            text-transform: uppercase;
        }
    }

    button.close {
        border: none;
        padding: 0 0 0 2em;
        background-color: transparent;
        cursor: pointer;

        img {
            width: 1.2em;
            display: inline-block;
            margin: 0;
            padding: 0;
        }
    }

    button.close:focus {
        outline: none;
    }

    button.close::-moz-focus-inner {
        border: 0;
    }

    header {
        display: flex;
        flex-direction: row;
        justify-content: space-between;
        align-items: center;
        font-size: 1.2em;
    }

    .content {
        padding: 1.25em;
    }

    ${theme.mediaMediumScreen} {
        display: flex;
        align-items: center;
        justify-content: center;

        .box {
            position: relative;
            transform: none;
            top: 0;
            left: 0;
            max-height: 100%;

            header button.close img {
                width: 1.7em;
            }

            .content {
                height: 40em;
                display: flex;
                flex-direction: column;
                overflow: auto;

                .raw-html {
                    height: 100%;
                }
            }

            footer {
                position: absolute;
                z-index: 10001;
                overflow: hidden;
                margin-top: -3em;
                width: 100%;
                height: 3em;

                .fcontent {
                    height: 100%;
                    background: linear-gradient(transparent 0%, white);
                }

                .fcontent:after {
                    content: ' ';
                }
            }
        }
    }

    ${theme.mediaSmallScreen} {
        background-color: hsla(0,0%,8%,.7);

        .box {
            height: calc(100vh - 2em);
            width: calc(100vw - 1em);
            margin: 0 auto;

            .content {
                height: calc(100vh - 9em);
                overflow: auto;
            }
        }

        button.close {
            img {
                width: 1.8em;
            }
        }
    }
`;

// ---------------- <WdgTooltip /> --------------------------------------

export const WdgTooltip = styled.div`
    background-color: #FFFFFF;
    z-index: 10000;
    padding: ${props => props.multiword ? '0.3em 1em 1.3em 1em' : '1em'};
    border: 1px solid ${theme.colorLightGrey};
    border-radius: 3px;
    border-spacing: 0;
    border-collapse: collapse;
    line-height: 1.2em;
    box-shadow: 0 0 5px rgba(0, 0, 0, 0.25);

    table {
        .value {
            ${props => props.multiword ? null : 'font-weight: bold'};
            text-align: left;
        }

        .label {
            text-align: ${props => props.multiword ? 'center' : 'right'};
            padding: ${props => props.multiword ? '0 10px 0 10px' : '0 0.4em 0 0'};
            ${props => props.multiword ? 'font-weight: 900' : null};
            ${props => props.multiword ? 'color: white' : null};
        }

        th {
            padding: ${props => props.multiword ? '10px 0' : '0 0 1em 0'};
            ${props => props.multiword ? 'text-align: left' : null};
            ${props => props.multiword ? 'font-weight: bolder' : null};
        }

        td {
            text-align: left;
        }

        td.numWh {
            text-align: right;
            padding: ${props => props.multiword ? '0 0 0 10px' : '0 0 0 1em'};
        }

        td.numDec {
            padding: 0;
        }

        td.unit {
            text-align: left;
        }
    }
`;

// ---------------- <BacklinkForm /> --------------------------------------

export const BacklinkForm = styled.form`
    display: inline;
    padding: 0;

    button {
        display: inline;
        padding: 0 12px 0 0;
        border: none;
        background-color: transparent;
        cursor: pointer;
        text-decoration: none;
        color: #009ee0;
        background-image: url(../../../assets/external-link.png); // TODO
        background-repeat: no-repeat;
        background-position: 99% 0;
    }

    button:hover {
        text-decoration: underline;
    }
`;

// ---------------- <SourceInfoBox /> --------------------------------------

export const SourceInfoBox = styled.div`
    font-size: 1.1em;

    ul.information-tab-sel {

        list-style-type: none;
        text-align: center;
        margin-top: 0;
        margin-bottom: 2.5em;
        padding: 0;

        li {
            display: inline-block;
            font-size: 1em;

            a {
                color: ${theme.colorDefaultText};
                cursor: pointer;
                margin: 0 0.6em;
                text-decoration: none;
            }

            a.current {
                border-color: ${theme.colorLogoBlue};
                border-style: solid;
                border-width: 0 0 2px 0;
            }

            .separ {

            }
        }
    }

    table.struct-info {
        th {
            text-align: left;
            font-weight: normal;
            color: ${theme.colorLogoPink};
        }
    }

    h2 {
        margin-bottom: 1em;
        font-size: 1.3em;
        font-weight: normal;
    }

    dl {

        dt {
            margin-bottom: 0.4em;
            color: ${theme.colorLightText};
            font-family: ${theme.condensedFontFamily};
        }

        dd {
            margin-left: 1.2em;
        }

        dd:not(:last-child) {
            margin-bottom: 0.9em;
        }
    }

    .empty-citation-info {
        margin-bottom: 0.7em;
    }

    td.numeric {
        padding-left: 1em;
        text-align: right;
    }

    .keyword {
        border-style: solid;
        border-color: ${theme.colorLogoBlue};
        border-width: 1pt;
        border-radius: 5px;
        margin: 0.4em 0.2em;
        padding: 0.2em 0.4em;
        font-size: small;
    }

    .citation {
        em {
            color: ${theme.colorLogoPink};
        }

        a {
            color: ${theme.colorLogoBlue};
        }
    }

    a.external {
        background-image: url(../../../assets/external-link.png); // TODO
        background-repeat: no-repeat;
        background-position: 99% 0;
        padding-right: 1.1em;
    }
`;
