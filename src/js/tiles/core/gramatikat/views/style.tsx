/*
 * Copyright (c) 2026 Charles University in Prague, Faculty of Arts,
 *                    Institute of the Czech National Corpus
 * Copyright (c) 2026 Tomas Machalek <tomas.machalek@gmail.com>
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

import { Theme } from '../../../../page/theme.js';
import { styled } from 'styled-components';

// ------------------- <SingleWordView /> --------------------------------

export const SingleWordView = styled.div<{ theme: Theme }>`
    padding-top: 3em;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;

    h2 {
        text-align: center;
        font-size: 1em;
        font-weight: normal;
        margin: 0 0 5em 0;
        padding: 0 0 0.8em 0;
        text-align: left;
    }

    .main-block {
        margin-bottom: 1.5em;
    }

    .visualisation {
        overflow-x: auto;
        display: flex;
        align-items: stretch;
        justify-content: center;
        width: 100%;

        .sep {
            flex-grow: 1;
        }

        .heatm {
            margin-right: 3rem;
        }
    }

    p.note {
        color: ${(props) => props.theme.colorLightText};
        font-size: 0.8em;
        margin: 2em 0 2em 0;
        padding: 0;
        text-align: center;
    }
`;

// ---------------- <Heatmap /> -----------------------------------

export const Heatmap = styled.div<{ theme: Theme }>`
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.2rem;

    table {
        margin-top: 2em;
        border-collapse: collapse;

        td {
            border: 4px solid
                ${(props) => props.theme.oddDataLineBackgroundColor};
        }

        td {
            width: 3rem;
            padding: 0.4rem 0.6rem;
            text-align: right;
        }

        th {
            font-weight: normal;
            padding: 0.4rem 0.6rem;
        }

        th.grouped:not(:last-child) {
            border-style: solid;
            border-width: 0 4px 0 0;
            border-color: ${(props) => props.theme.oddDataLineBackgroundColor};
        }

        th.row {
            padding-right: 0.4rem;
            white-space: nowrap;
        }

        span.up {
            padding-right: 0.3rem;
        }

        span.down {
            padding-right: 0.3rem;
        }

        th.vertical {
            padding-bottom: 1rem;

            span {
                display: inline-block;
                width: 5em;
                white-space: break-spaces;
            }
        }

        thead th {
            white-space: nowrap;
            vertical-align: bottom;

            > div {
                transform: rotate(-60deg);
                transform-origin: center center;
                margin-left: 35%;
                margin-bottom: 0.5rem;
            }
        }
    }
`;

// ------------------ <Settings /> ------------------

export const Settings = styled.div<{ theme: Theme }>`
    border-color: ${(props) => props.theme.colorLogoBlue};
    border-style: dashed;
    border-width: 0 0 1px 0;
`;

// ------------------ <WordGrammaticalOverview /> ------------------------

export const WordGrammaticalOverview = styled.div`
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-content: center;

    ul.degree-sel {
        list-style-type: none;
        margin: 0;
        display: flex;
        justify-content: center;

        li {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 1.5em 0;
        }

        li:not(:first-child) {
            margin-left: 1.5em;
        }

        label {
            display: flex;
        }

        input[type='checkbox'] {
            margin-left: 0.7em;
        }
    }
`;

// ------------------- <PosWarning /> -------------------------

export const PosWarning = styled.div`
    display: flex;
    align-items: center;
    font-size: 1.5em;

    img {
        padding: 1em;
        width: 2em;
        height: 2em;
    }

    p {
        flex-grow: 1;
    }
`;

// ------------------- <AttrSetSwitch /> ------------------------

export const AttrSetSwitch = styled.ul<{ theme: Theme }>`
    list-style-type: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;

    li {
        display: block;

        a {
            display: block;
            padding: 0.5rem 1rem;
            border: ${(props) => props.theme.tileBorderStyle};
            border-radius: ${(props) => props.theme.tileBorderRadius};
            cursor: pointer;
        }

        a.active {
            border-color: ${(props) => props.theme.colorLogoPink};
        }
    }

    li:not(first-child) {
        margin-top: 0.5rem;
    }
`;
