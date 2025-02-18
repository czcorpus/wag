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
import * as theme from '../../../views/common/theme.js';

export const ConcordanceTileView = styled.div`
    overflow: hidden;
`;

export const QueryInfo = styled.p`
    font-size: 1.2em;

    a.variant {
        cursor: pointer;
        color: ${theme.colorDefaultText};
        font-weight: bold;
        text-decoration: none;
    }

    a.variant:hover {
        text-decoration: underline;
    }
`;

export const Summary = styled.dl`
    margin-top: 0.7em;
    margin-bottom: 1em;

    dt, dd {
        display: inline-block;
        margin: 0;
    }

    dt {
        font-family: ${theme.condensedFontFamily};
        color: ${theme.colorLightText};
    }

    dd {
        font-weight: bold;
        margin-left: 0.3em;
        color: ${theme.colorLightText};
    }

    dd:not(:last-child)::after {
        content: " | ";
        font-weight: normal;
    }

    dt:not(:first-child) {
        margin-left: 0.3em;
    }
`;

export const LineMetadata = styled.div`
    max-width: 30em;
    position: absolute;
    padding: 1em;
    background-color: #FFFFFF;
    margin-left: 0em;
    border: 1px solid ${theme.colorLightGrey};
    border-radius: 3px;
    border-spacing: 0;
    border-collapse: collapse;
    box-shadow: 0 0 5px rgba(0, 0, 0, 0.25);

    dl {
        margin: 0;
        padding: 0;

        dd {
            margin-left: .7em;
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

export const ConcLines = styled.table`
    font-family: ${theme.condensedFontFamily};
    display: inline-block;
    border-spacing: 0;

    tr {
        td a.info-click {
            cursor: pointer;
            display: inline-block;
            margin-right: 0.7em;
            vertical-align: middle;

            img {
                display: block;
                margin: 0;
                width: 1em;
            }
        }
    }

    &.sent {
        display: block;

        tr:nth-child(odd) {
            background-color: ${theme.colorWhitelikeBlue};
        }

        tr {

            display: block;
            padding-left: 0.3em;

            td.left,
            td.right,
            td.kwic,
            td.meta {
                display: inline-block;
            }


        }
    }

    &.sent.aligned {
        tr.Row:nth-child(4n+1), tr.Row:nth-child(4n+2) {
            background-color: #eff9fe;
        }

        tr.Row:nth-child(4n+2), tr.Row:nth-child(4n) {
            margin-bottom: 0.1em;
        }
    }

    &:not(.sent) {
        tr.Row:nth-child(2n) {
            background-color: #eff9fe;
        }
    }
`;

export const Row = styled.tr`
    white-space: nowrap;

    td {
        padding-top: 0.2em;
        padding-bottom: 0.2em;
    }

    td.left {
        text-align: right;
    }

    td.right {
        text-align: left;
    }

    td.kwic {
        padding-left: 0.7em;
        padding-right: 0.7em;
        text-align: center;
        color: ${theme.colorLogoPink};
    }
`;

export const Controls = styled.form`
    margin-bottom: 0.7em;

    fieldset {
        border: none;
    }

    label {
        margin-right: 0.7em;
        display: inline-block;
    }
`;
