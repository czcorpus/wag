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
        width: 95%;
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

        .freq-highlight {
            border-width: 0 0 0 10px;
            border-style: solid;
            border-color: ${(props) => props.theme.colorLogoBlue};
            padding: 1rem 1rem 1rem 1.5rem;

            strong,
            dd.ipm {
                color: ${(props) => props.theme.colorLogoBlue};
            }
        }

        .general-info {
            border-width: 0 0 0 10px;
            border-style: solid;
            border-color: ${(props) => props.theme.pageBackgroundColor};
            padding: 1rem 1rem 1rem 1.5rem;
        }

        .pos-info {
            font-size: 1.1rem;
            font-style: italic;
        }

        .alternatives {
            font-size: 0.8em;
            color: ${(props) => props.theme.colorLightText};
        }

        .as-lemma {
            font-size: 0.7em;
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
    .grid-container {
        display: grid;
        grid-template-columns: auto auto 1fr auto;

        & > div {
            padding: 0.4em 0.7em;
            vertical-align: top;
        }

        .query-num {
            background-color: ${(props) => props.theme.tileHeadingSeparColor};
            color: ${(props) => props.theme.colorDefaultText};
            border-radius: 0.3em 0 0 0.3em;
            grid-row: span 5;
            display: flex;
            align-items: flex-start;
        }

        .property {
            text-align: left;
            vertical-align: middle;
            margin-bottom: 0.4em;
            color: ${(props) => props.theme.colorLightText};
            font-family: ${(props) => props.theme.condensedFontFamily};
            display: flex;
            align-items: center;
        }

        .highlighted-info.color-tile {
            width: 0.5rem;
            padding: 0;
            background-color: ${(props) => props.theme.colorLogoBlue};
        }

        .highlighted-info.value strong,
        .highlighted-info.freq-info.value {
            color: ${(props) => props.theme.colorLogoBlue};
        }

        .general-info.color-tile {
            width: 0.5rem;
            padding: 0;
            background-color: ${(props) => props.theme.tileHeadingSeparColor};
        }

        .value {
            font-size: 1.3rem;
            vertical-align: middle;
            display: flex;
            align-items: center;
        }

        .rowspan-2 {
            grid-row: span 2;
        }

        .rowspan-3 {
            grid-row: span 3;
        }

        .separ {
            grid-column: 1 / -1;
            height: 1.5rem;
            padding: 0;
        }

        .pos-info {
            font-style: italic;
            font-size: 1.1rem;
        }
    }
`;

// ----------------------

export const SrchButton = styled.button`
    display: inline-flex;
    margin-left: 0.7em;
    justify-content: center;
    width: 2rem;
    border: none;
    cursor: pointer;
    background-color: ${(props) => props.theme.colorLogoBlue};
    padding: 0.3rem 0 0.3rem 0;
    //border: 1px solid rgba(0, 0, 0, 0.8);
    box-shadow:
        0 4px 14px rgba(0, 0, 0, 0.25),
        0 2px 4px rgba(0, 0, 0, 0.15);
    border-radius: ${(props) => props.theme.formElementsBorderRadius};

    img {
        width: 1rem;
        height: 1rem;
    }
`;
