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
import * as theme from './theme';

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
