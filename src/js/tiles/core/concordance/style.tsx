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

// ------------- <ConcordanceTileView /> ------------------

export const ConcordanceTileView = styled.div`
    overflow: hidden;
`;

// ------------- <QueryInfo /> ---------------------------

export const QueryInfo = styled.p<{ theme: Theme }>`
    font-size: 1.2em;
    display: flex;
    justify-content: center;

    .dot {
        color: ${props => props.theme.colorLogoPink};
        margin-left: 0.5em;
    }

    a.variant {
        cursor: pointer;
        color: ${(props) => props.theme.colorDefaultText};
        font-weight: bold;
        text-decoration: none;
        margin-left: 0.5em;
        margin-right: 0.5em;
        text-decoration: none;

        &.current {
            color: ${props => props.theme.colorLogoPink};
            cursor: initial;
        }
    }

    a.variant:hover {
        text-decoration: underline;
    }

    a.variant.current:hover {
        text-decoration: none;
    }
`;

// ------------ <Summary /> -----------------------

export const Summary = styled.dl<{ theme: Theme }>`
    margin-top: 0.7em;
    margin-bottom: 1.5em;

    dt,
    dd {
        display: inline-block;
        margin: 0;
    }

    dt {
        font-family: ${(props) => props.theme.condensedFontFamily};
        color: ${(props) => props.theme.colorLightText};
    }

    dd {
        font-weight: bold;
        margin-left: 0.3em;
        color: ${(props) => props.theme.colorLightText};
    }

    dd:not(:last-child)::after {
        content: ' | ';
        font-weight: normal;
    }

    dt:not(:first-child) {
        margin-left: 0.3em;
    }
`;

// ---------------- <LineMetadata /> ---------------------

export const LineMetadata = styled.div<{ theme: Theme }>`
    max-width: 30em;
    position: absolute;
    padding: 1em;
    background-color: ${(props: { theme: Theme }) =>
        props.theme.tileBackgroundColor};
    margin-left: 2em;
    border: 1px solid ${(props) => props.theme.colorInvertedSecondaryText};
    border-radius: 3px;
    border-spacing: 0;
    border-collapse: collapse;
    box-shadow: 0 0 5px rgba(0, 0, 0, 0.25);
    z-index: 10000;

    dl {
        margin: 0;
        padding: 0;

        dd {
            margin-left: 0.7em;
            padding-left: 0;
        }

        dt:not(:first-child) {
            margin-top: 0.7em;
        }

        dt {
            font-weight: bold;
            margin-left: 0;
            margin-bottom: 0.2em;
            padding-left: 0;
        }
    }
`;


// ---------------- <ConcLines /> ---------------------

export const ConcLines = styled.div<{ theme: Theme }>`
    font-family: ${(props) => props.theme.condensedFontFamily};
    display: flex;
    border-spacing: 0;
    border-collapse: collapse;
    overflow-x: auto;

    table {
        border-collapse: collapse;
    }

    tr {
        td a.info-click {
            cursor: pointer;
            display: flex;
            margin-right: 0.7em;
            vertical-align: middle;

            img {
                display: block;
                margin: 0;
                width: 1em;
            }
        }

        span.kwic {
            display: inline-block;
            padding-left: 0.3em;
            padding-right: 0.3em;
            color: ${(props) => props.theme.colorLogoPink};
        }
    }

    tr.separator:not(:last-of-type) td {
        border-width: 0 0 1px 0;
        border-color: ${(props) => props.theme.colorInvertedSecondaryText};
        border-style: solid;
    }

    tr:not(:last-of-type) td {
        border: none;
    }

    &.sent {
        display: block;

        tr:nth-child(odd) {
            background-color: ${(props) => props.theme.colorWhitelikeBlue};
        }

        tr {
            padding-left: 0.3em;
        }
    }

    &.sent.aligned {
        tr.Row:nth-child(4n + 1),
        tr.Row:nth-child(4n + 2) {
            background-color: #eff9fe;
        }

        tr.Row:nth-child(4n + 2),
        tr.Row:nth-child(4n) {
            margin-bottom: 0.1em;
        }
    }

    &:not(.sent) {
        tr.Row:nth-child(2n) {
            background-color: #eff9fe;
        }
    }
`;

// ----------- <Row /> ---------------------------------

export const Row = styled.tr<{ theme: Theme }>`
    white-space: nowrap;

    &.odd {
        background-color: ${(props) => props.theme.oddDataLineBackgroundColor};

        td.meta.sticky {
            background-color: ${(props) =>
                props.theme.oddDataLineBackgroundColor};
        }
    }

    td {
        padding-top: 0.3em;
        padding-bottom: 0.3em;
    }

    td.meta.sticky {
        position: sticky;
        left: 0;
        background-color: ${(props) => props.theme.tileBackgroundColor};
    }

    td.left {
        text-align: right;
    }

    td.right {
        text-align: left;
    }

    td.kwic {
        padding-left: 0.5em;
        padding-right: 0.5em;
        text-align: center;
        color: ${(props) => props.theme.colorLogoPink};
    }

    td .coll {
        color: ${(props) => props.theme.colorLogoPink};
        font-style: italic;
        display: inline-block;
        padding-left: 0.2em;
        padding-right: 0.2em;
    }
`;

// ------------------ <SentRow /> ----------------------------------

export const SentRow = styled.tr<{ theme: Theme }>`
    &.highlighted {
        background-color: ${(props) => props.theme.colorDataHighlightRow};
    }

    &.odd {
        background-color: ${(props) => props.theme.oddDataLineBackgroundColor};
    }

    white-space: inherit;

    td {
        padding-top: 0.3em;
        padding-bottom: 0.3em;
    }

    td.meta {
        padding-left: 0.4em;

        a {
            display: block;
        }
    }

    td .coll {
        color: ${(props) => props.theme.colorLogoPink};
        font-style: italic;
        display: inline-block;
        padding-left: 0.2em;
        padding-right: 0.2em;
    }
`;

// ---------------- <Controls /> ----------------------------

export const Controls = styled.form<{ theme: Theme }>`
    margin-bottom: 0.7em;

    fieldset {
        border: none;
    }

    label {
        margin-right: 0.7em;
        display: inline-block;
    }
`;
