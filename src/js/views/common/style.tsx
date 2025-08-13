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

import { Theme } from '../../page/theme.js';
import { styled } from 'styled-components';


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
        color: ${props => props.theme.colorLightText};

        a {
            cursor: pointer;
            text-decoration: none;
            color: ${props => props.theme.colorLogoBlue};
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
                color: ${props => props.theme.colorSuperlightGrey};
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
        color: ${props => props.theme.colorWhitelikeBlue};
        background-color: ${props => props.theme.colorWhitelikeBlue};
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
        background: linear-gradient(0.25turn, #ffffff, ${(props:{theme:Theme}) => props.theme.colorLogoPink}, #ffffff);
    }
`;

// ---------------- <HorizontalBlockSwitch /> --------------------------------------

export const HorizontalBlockSwitch = styled.div`
    padding-top: 0.3em;
    padding-top: 0.3em;
    text-align: center;

    a {
        color: ${props => props.theme.colorLogoBlue};
        cursor: pointer;
        font-size: 2em;
        padding: 0.2em;
        display: inline-block;
    }

    a:hover {
        text-decoration: none;
    }

    a.current {
        color: ${props => props.theme.colorLogoBlueShining};
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

export const ResponsiveWrapper = styled.div<{$minWidth:number}>`
    width: 100%;
    height: 100%;
    min-width: ${props => props.$minWidth ? props.$minWidth : 'auto'};
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


    ${props => props.theme.cssMediaMediumSize} {
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

    ${props => props.theme.cssMediaSmallSize} {
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

export const WdgTooltip = styled.div<{$multiword?:boolean, theme:Theme}>`
    background-color: #FFFFFF;
    z-index: 10000;
    padding: ${props => props.$multiword ? '0.3em 1em 1.3em 1em' : '1em'};
    border: 1px solid ${props => props.theme.colorInvertedSecondaryText};
    border-radius: 3px;
    border-spacing: 0;
    border-collapse: collapse;
    line-height: 1.2em;
    box-shadow: 0 0 5px rgba(0, 0, 0, 0.25);

    .footer {
        margin-top: 0.7em;
    }

    table {
        .value {
            ${props => props.$multiword ? null : 'font-weight: bold'};
            text-align: left;
        }

        .label {
            text-align: ${props => props.$multiword ? 'center' : 'right'};
            padding: ${props => props.$multiword ? '0 10px 0 10px' : '0 0.4em 0 0'};
            ${props => props.$multiword ? 'font-weight: 900' : null};
            ${props => props.$multiword ? 'color: white' : null};
        }

        th {
            padding: ${props => props.$multiword ? '10px 0' : '0 0 1em 0'};
            ${props => props.$multiword ? 'text-align: left' : null};
            ${props => props.$multiword ? 'font-weight: bolder' : null};
        }

        td {
            text-align: left;
        }

        td.numWh {
            text-align: right;
            padding: ${props => props.$multiword ? '0 0 0 10px' : '0 0 0 1em'};
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

export const BacklinkButton = styled.button<{$createStaticUrl: (file:string) => string, theme:Theme}>`
    display: inline;
    padding: 0 12px 0 0;
    border: none;
    background-color: transparent;
    cursor: pointer;
    text-decoration: none;
    color: ${props => props.theme.colorLogoBlue};
    background-image: url(${props => props.$createStaticUrl('external-link.svg')});
    background-repeat: no-repeat;
    background-position: 99% 0;

    :hover {
        text-decoration: underline;
    }
`;

// ---------------- <SourceInfoBox /> --------------------------------------

export const SourceInfoBox = styled.div<{theme:Theme, $createStaticUrl: (file:string) => string}>`
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
                color: ${props => props.theme.colorDefaultText};
                cursor: pointer;
                margin: 0 0.6em;
                text-decoration: none;
            }

            a.current {
                border-color: ${props => props.theme.colorLogoBlue};
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
            color: ${props => props.theme.colorLogoPink};
        }
    }

    h2 {
        margin-bottom: 0;
        margin-top: 0.9em;
        font-size: 1.2em;
        font-weight: normal;
    }

    dl {

        dt {
            margin-bottom: 0.4em;
            color: ${props => props.theme.colorLightText};
            font-family: ${props => props.theme.condensedFontFamily};
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
        border-color: ${props => props.theme.colorLogoBlue};
        border-width: 1pt;
        border-radius: 5px;
        margin: 0.4em 0.2em;
        padding: 0.2em 0.4em;
        font-size: small;
    }

    .citation {
        em {
            color: ${props => props.theme.colorLogoPink};
        }

        a {
            color: ${props => props.theme.colorLogoBlue};
        }
    }

    a.external {
        background-image: url(${props => props.$createStaticUrl('external-link.svg')});
        background-repeat: no-repeat;
        background-position: 99% 0;
        padding-right: 1.1em;
    }
`;

export const Paginator = styled.span`
    a {
        cursor: pointer;
    }

    a.disabled {
        cursor: default;
    }

    .arrow {
        width: 1em;
        display: inline-block;
        vertical-align: middle;
    }

    input.page {
        width: 3em;
        margin-left: 0.3em;
        margin-right: 0.3em;
    }
`;
