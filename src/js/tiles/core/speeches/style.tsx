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

import { Theme } from '../../../page/theme.js';
import { styled } from 'styled-components';

// -------------- <SpeechesTile /> -----------------

export const SpeechesTile = styled.div<{theme:Theme}>`
    tr.expand {

        th {
            text-align: right;
            padding-right: 0.2em;

            a {
                width: 3em;
                display: inline-block;
                cursor: pointer;

                img {
                    width: 1.4em;
                }
            }
        }
    }

    .navig {
        margin-bottom: 0.4em;
        display: flex;
        align-content: flex-end;

        .next, .expand {

            margin-right: 2em;

            a {
                display: block;
                cursor: pointer;

                img {
                    width: 1.2em;
                    display: block;
                }
            }
        }

        .expand a img {
            position: relative;
            top: 0.15em;
            width: 1.6em;
        }
    }

    div.play-all {

        text-align: right;

        a {
            cursor: pointer;
        }
    }
`;


// -------------- <Speeches /> -----------------

export const Speeches = styled.dl<{theme:Theme}>`
    border-spacing: 0;

    dd, dt {
        margin: 0;
    }
`;

// -------------- <Speaker /> -----------------

export const Speaker = styled.dt<{theme:Theme}>`
    text-align: left;
    strong {
        border: 1px solid ${props => props.theme.colorLightText};
        border-radius: ${props => props.theme.defaultBorderRadius};
        display: inline-block;
        vertical-align: middle;
        font-size: 0.8em;
        font-weight: normal;
        padding: 0.05em 0.7em;
    }

    &:not(:first-of-type) {
        margin-top: 1.2em;
    }
`;

// -------------- <Speech /> -----------------

export const Speech = styled.dd`
    margin-top: 0.3em;
    line-height: 1.2em;
    margin-left: 0.7em;

    .speech-text {
        display: block;
    }

    .speech-text.focus {
        background-color: #FFFFFF;
    }

    .plus {
        font-weight: bold;
        font-size: 110%;
    }

    .overlap {
        float: right;
        width: 1em;
    }

    .coll {
        color: ${props => props.theme.colorLogoPink};
        font-weight: bold;
    }
`;

// -------------- <PlayerIcon /> -----------------

export const PlayerIcon = styled.a<{theme:Theme}>`
    display: inline-block;
    vertical-align: middle;
    margin-left: 1em;
    margin-bottom: 0.1em;
    cursor: pointer;

    img {
        display: block;
        width: 2em;
    }
`;
