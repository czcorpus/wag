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

import { styled } from 'styled-components';
import * as theme from './common/theme.js';

// ---------------- <WdglanceMain /> --------------------------------------

export const WdglanceMain = styled.div``;

// ---------------- <MessagesBox /> --------------------------------------

export const MessagesBox = styled.div`
    position: fixed;
    left: 50%;
    z-index: 10000;
    top: 20%;
`;

// ---------------- <Messages /> --------------------------------------

export const Messages = styled.ul`
    min-width: 20em;
    list-style-type: none;
    position: relative;
    left: -50%;
    margin: 0;
    padding: 0;
`;

// ---------------- <SystemMessage /> --------------------------------------

export const SystemMessage = styled.li`
    background-color: #444444;
    border-radius: .25em;
    box-shadow: 0.05em 0.05em 0.15em 0.05em rgba(0,0,0, 0.2);
    color: #FFFFFF;
    margin: 0;
    padding: 0;

    .wrapper {

        display: block;
        padding: 1.2em 0.5em 1.2em 0.5em;
        margin-top: 0.2em;
        margin-bottom: 0.2em;

        .flex {

            width: 100%;
            display: flex;
            flex-direction: row;
            align-items: center;
            justify-content: start;

            > *:not(:last-child):not(:first-child) {
                margin-left: 1em;
                margin-right: 1em;
            }

            > *:first-child {
                margin-left: 0.5em;
            }

            > *:last-child {
                margin-right: 0.5em;
            }

            .info-icon {
                width: 1.2em;
                display: block;
            }

            p.text {
                margin: 0;
                flex-grow: 1;
            }

            .close {
                a {
                    cursor: pointer;

                    img {
                        display: block;
                        width: 1em;
                    }
                }
            }
        }
    }
`;

// ---------------- <WdglanceControls /> --------------------------------------

export const WdglanceControls = styled.div`
    text-align: center;
    padding: 1em;

    .LemmaSelector {
        font-size: 80%;
        padding: 0.8em 0 0 0;
        color: #454545;

        .curr {
            font-size: 125%;
            color: ${theme.colorLogoPink};
        }

        .variants > ul {
            display: inline;
            margin: 0;
            padding: 0;
            list-style-type: none;

            li {
                margin: 0;
                padding: 0;
                display: inline-block;

                a {
                    color: ${theme.colorLogoBlue};
                    cursor: pointer;
                }

                a:hover {
                    text-decoration: underline;
                }
            }
        }

        a.modal-box-trigger {
            cursor: pointer;
            color: ${theme.colorLogoPink};
        }
    }

    .LemmaSelector.multiple-queries  {
        font-size: 1.25em;
        text-align: left;
        padding-top: 0;

        .variants {

            h2.query-num {
                font-size: 1.1em;
                margin: 1.1em 0 0.2em 0;
                text-align: center;
                letter-spacing: 0.1em;
            }

            ul {
                display: block;
                list-style-type: none;
                text-align: left;
            }

            li {
                margin: 0;
                padding: 0.1em 0;
                display: block;

                em {
                    font-style: normal;
                    color: ${theme.colorLogoPink};
                }

                input[type="radio"] {
                    display: inline-block;
                    padding: 0;
                    vertical-align: middle;
                    margin: 0 0.3em 0 0;
                }
            }
        }

        h2.query-num:first-child h2.query-num {
            margin-top: 0;
        }

        .buttons {
            text-align: center;
        }
    }

    .main {
        margin-top: 1em;
        display: flex;
        align-items: center;
        justify-content: center;

    }

    .DomainSelector {

        margin-top: 0.1em;
        margin-bottom: 1.5em;

        .item {

            display: inline-block;

            a {
                padding: 0.2em;
                cursor: pointer;
                display: block;
                text-decoration: none;
            }

            a:hover {
                color: ${theme.colorLogoBlue};
            }

        }

        .item.current {
            border-style: solid;
            border-color: ${theme.colorLogoBlue};
            border-width: 0 0 2px 0;
        }
    }

    .translat-lang-selector {
        margin: 0;
    }

    input.invalid {
        border-color: red;
    }

    .arrow {
        margin-right: 0.3em;
        margin-left: 0.3em;
        font-size: 1.5em;
        color: rgba(0, 0, 0, 0.2);
    }

    .SubmitButton {
    }

    .QueryInput {
        margin-right: 0.7em;
        margin-left: 1em;
    }

    .QueryInput.invalid {
        border-color: ${theme.colorLogoOrange};
    }

    .input-group .input-row:not(:last-child) {
        margin-bottom: 0.3em;
    }

    .input-group {
        list-style-type: none;
        text-align: left;
        margin: 0 1.5em 0 0.5em;
        padding: 0;

        .input-row {

            margin: 0;
            padding: 0;
            display: flex;
            align-items: center;

            .RemoveCmpQueryField {

                display: inline-block;
                padding: 0;
                margin: 0;

                button {
                    display: block;
                    background: none;
                    border: none;
                    padding: 0;
                    cursor: pointer;

                    img {
                        width: 1em;
                        display: block;
                    }
                }
            }

        }

        .AddCmpQueryField {

            margin-top: 0.7em;
            text-align: center;

            button {
                padding: 0;
                margin: 0;
                background: none;
                border: none;
                cursor: pointer;
                display: inline-block;

                img {
                    display: block;
                    margin: 0;
                    padding: 0;
                    width: 1.2em;
                }
            }
        }
    }

    ${theme.media.medium} {
        .main {
            flex-wrap: wrap;

            > * {
                margin-top: 0.3em;
                margin-bottom: 0.3em;
            }
        }

        .translat-lang-selector {
            margin-left: 0;
        }


        .DomainSelector {

            margin-bottom: 0.7em;

            span.item {
                display: block;
                margin-left: 0;
                padding-top: 0.1em;
                padding-bottom: 0.1em;

                a:not(:first-child) {
                    margin: 0;
                }
            }

            .item.current {
                border: none;
                color: ${theme.colorLogoBlue};
            }

            .item.current a:after {
                content: "\\00a0\\25AA";
            }

            .item.current a:before {
                content: "\\25AA\\00a0";
            }

            span.separ {
                display: none;
            }
        }
    }

    ${theme.media.small} {
        padding: 0;
        margin-bottom: 2em;

        .main .SubmitButton button {
            padding: 0.5em 1.5em 0.5em 1.5em;
        }

        .DomainSelector {
            margin-top: 0.2em;
        }
    }
`;

// ---------------- <NothingFoundBox /> --------------------------------------

export const NothingFoundBox = styled.div`
    font-size: 130%;
    text-align: center;
    max-width: 40em;
    margin: 0 auto;
`;

// ---------------- <TooManyErrorsBox /> --------------------------------------

export const TooManyErrorsBox = styled(NothingFoundBox)`
    font-size: 130%;
    margin-top: 2em;

    a {
        cursor: pointer;
    }
`;

// ---------------- <TilesSections /> --------------------------------------

export const TilesSections = styled.section`
    padding: 0.7em;

    & > header .loader {
        position: absolute;
        left: calc(100% - 100px);
    }

    ${theme.media.medium} {
        padding: 0;
    }

    ${theme.media.small} {
        padding: 0;
    }
`;

// ---------------- <Group /> --------------------------------------

export const Group = styled.section`

    & > header {

        padding: 0;
        margin-top: 0;
        margin-bottom: 1.2em;

        display: flex;
        align-items: flex-start;
        justify-content: flex-start;
    }

    ${TilesSections} > &:not(:first-child) {
        margin-top: 1.7em;
    }

    ${theme.media.medium} {
        & > header {
            display: block;

            .description {
                margin-top: 0.7em;
            }
        }
    }

    ${theme.media.small} {
        & > header {
            display: block;

            .description {
                margin-top: 0.7em;
                margin-left: 0;
            }
        }
    }
`;

// ---------------- <MinimizedGroup /> --------------------------------------

export const MinimizedGroup = styled.ul`
    background-color: #FFFFFF;
    border-radius: 0.25em;

    list-style-type: none;
    margin: 0;
    padding: 1.25em;

    li {
        a {
            color: ${theme.colorLogoBlue};
            cursor: pointer;
        }
    }

    li:not(:last-child) {
        margin-bottom: 0.3em;
    }
`;

// ---------------- <Tiles /> --------------------------------------

export const Tiles = styled.section`
    display: grid;
    grid-gap: 1em;
    grid-template-columns: 1fr 1fr 1fr;
    color: #444;


    .app-output.span1 {
        grid-column: span 1;
    }

    .app-output.span2 {
        grid-column: span 2;
    }

    .app-output.span3 {
        grid-column: span 3;
    }

    .app-output {
        border-color: ${theme.colorLogoBlue};
        border-radius: ${theme.defaultBorderRadius};
        overflow: hidden;
        display: flex;
        flex-direction: column;

        .panel {
            display: flex;
            flex-direction: row;
            justify-content: space-between;
            align-items: center;

            .window-buttons  {

                display: flex;
                flex-direction: row;
                align-items: center;

                span.bar-button {
                    vertical-align: middle;
                    white-space: nowrap;

                    button {
                        border: none;
                        background-color: transparent;
                        cursor: pointer;

                        img {
                            width:1.2em;
                        }
                    }

                    button:focus {
                        outline: none;
                    }

                    button::-moz-focus-inner {
                        border: 0;
                    }
                }
            }

            .window-buttons span.TweakButton.bar-button {
                img {
                    width: 1.3em;
                }
            }

            .window-buttons > span.disabled {
                button {
                    cursor: default;
                }
            }

            h2 {
                margin: 0;
                padding: 0;
                font-size: 1.3em;
                font-weight: normal;
            }

            h3 {
                font-size: 1.1em;
            }
        }

        .provider {
            box-sizing: border-box;
            flex-grow: 1;
            display: block;
            margin: 0;
            overflow: hidden;
        }

        .provider.hidden {
            display: none;
        }
    }

    ${theme.media.medium} {
        display: grid;
        grid-gap: 1em;
        grid-template-columns: 1fr;
        color: #444;

        .app-output.span1 {
            grid-column: auto;
        }

        .app-output.span2 {
            grid-column: auto;
        }

        .app-output.span3 {
            grid-column: auto;
        }

        .app-output .panel {

            .window-buttons span.bar-button button img {
                width:1.7em;
            }
        }
    }

    ${theme.media.small} {
        .app-output .panel h2 {
            font-size: 1.1em;
        }
    }
`;

// ---------------- <TileGroupButton /> --------------------------------------

export const TileGroupButton = styled.section`

    width: 25em;

    &.disabled {

        h2 {
            background-color: ${theme.colorLightText};

            .flex {

                a:hover {
                    color: inherit;
                }

                .switch-common {
                    cursor: default;
                }
            }
        }
    }

    & > * {
        vertical-align: middle;
    }

    h2 {
        background-color: ${theme.colorLogoBlue};
        color: #ffffff;
        border-radius: 0.25em;
        font-weight: 400;
        font-size: 1.3em;
        box-shadow: 0 -0.1em 0 0 rgba(0,0,0, .25) inset;
        margin: 0;
        padding: 0.1em;

        .flex {
            display: flex;
            align-items: center;
            justify-content: flex-start;

            > * {
                margin: 0.2em 0;
            }

            > *:first-child {
                margin-left: 0.4em;
            }

            > *:last-child {
                margin-right: 0.4em;
            }

            a {
                color: #FFFFFF;
                cursor: pointer;
            }

            a:hover {
                color: ${theme.colorLogoBlueShining};
            }

            .triangle {
                display: inline-block;
                width: 1em;

                img {
                    width: 0.65em;
                    vertical-align: middle;
                    position: relative;
                    margin-top: -0.2em;
                }
            }

            .triangle.right img {
                width: 0.5em;
            }

            .switch-common {

                flex-grow: 2;
                margin-left: 0.4em;
            }

            .help {
                border-style: solid;
                border-color: #FFFFFF;
                border-width: 0 0 0 1px;
                padding-left: 0.3em;
                font-size: 1.1em;
            }
        }
    }

    ${theme.media.medium} {

        white-space: normal;

        & > * {
            vertical-align: middle;
        }

        h2 {
            display: block;

            .flex {
                display: flex;
                align-items: center;
                justify-content: space-between;


                a:hover {
                    color: #FFFFFF;
                }

                .help {
                    margin-left: auto;
                }

            }
        }
    }

    ${theme.media.small} {

        width: 100%;
        white-space: normal;

        h2 {
            display: block;
            font-size: 1.1em;

            .flex {
                display: flex;
                align-items: center;
                justify-content: space-between;

                a:hover {
                    color: #FFFFFF;
                }

                .help {
                    border-width: 0;
                    font-weight: bold;
                    font-size: 120%;
                    padding-right: 0.2em;
                }

            }
        }
    }
`;

// ---------------- <ErrPage /> --------------------------------------

export const ErrPage = styled.div`
    margin: 2em auto 3em auto;
    margin-bottom: 2em;
    max-width: 20em;

    header.err {
        color: ${theme.colorLogoPink};
    }

    a {
        color: ${theme.colorLogoBlue};
    }
`;
