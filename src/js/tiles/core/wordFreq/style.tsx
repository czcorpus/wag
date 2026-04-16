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
import { Theme } from '../../../page/theme.js';

// ------------- <WordFreqTileView /> -----------------------------

export const WordFreqTileView = styled.div<{ theme: Theme }>`
    display: flex;
    align-items: stretch;
    justify-content: space-between;

    & > div {
        width: 90%;
    }

    .chart {
        h2 {
            margin: 0 0 0.7em 0;
            font-weight: bold;
            font-size: 1.1em;
            text-align: center;
        }

        width: 340px;
    }

    & > div.cell:not(:last-child) {
        margin-bottom: 1.7em;
    }

    dl.info {
        dt {
            margin-bottom: 0.4em;
            color: ${(props) => props.theme.colorLightText};
            font-family: ${(props) => props.theme.condensedFontFamily};
        }

        dd {
            font-size: 1.5em;
            margin-left: 1em;

            span.squareb {
                color: ${(props) => props.theme.colorLightText};
            }
        }

        dl {
            font-size: 0.8em;
            margin-top: 0.7em;

            dt {
                font-size: 0.9em;
            }
        }

        dd:not(:last-child) {
            margin-bottom: 0.7em;
        }

        dd.word-list {
            line-height: 1.5em;
            font-size: 1.3em;
            a {
                color: ${(props) => props.theme.colorDefaultText};
                cursor: pointer;
                text-decoration: none;
            }

            a:hover {
                color: ${(props) => props.theme.colorLogoBlue};
                text-decoration: underline;
            }
        }
    }

    ${(props) => props.theme.cssMobileScreen} {
        flex-direction: column;

        & > div.cell h3 {
            margin-top: 1em;
        }
    }
`;

// ------------- <Stars /> -----------------------------

export const Stars = styled.span<{ theme: Theme }>`
    display: block;
    white-space: nowrap;

    img {
        width: 1em;
    }
`;

// ------------- <MultiWordProfile /> -----------------------------

export const MultiWordProfile = styled.div<{ theme: Theme }>`
    & > table {
        border-spacing: 2px 4px;

        td,
        th {
            padding: 0.4em 0.7em;
            vertical-align: top;
        }

        th.query-num {
            background-color: ${(props) => props.theme.tileHeadingSeparColor};
            color: ${(props) => props.theme.colorDefaultText};
            border-radius: 0.3em;
        }

        th.property {
            text-align: left;
            vertical-align: middle;
            margin-bottom: 0.4em;
            color: ${(props) => props.theme.colorLightText};
            font-family: ${(props) => props.theme.condensedFontFamily};
        }

        td.value {
            font-size: 1.3rem;
            vertical-align: middle;
        }

        td.freq-info,
        th.freq-info {
            padding-left: 1.5em;
        }

        th.freq-info::before {
            content: '\\25CF ';
            display: inline-block;
            width: 1.1rem;
            padding-right: 0.4rem;
        }
    }
`;
