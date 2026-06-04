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

    table.data {
        margin-bottom: 1em;
        border-width: 2px;
        border-style: solid;
        border-color: ${(props) => props.theme.oddDataLineBackgroundColor};

        td,
        th {
            padding: 0.4em 0.8em;
        }

        .no-bg-col {
            background-color: ${(props) => props.theme.tileBackgroundColor};
        }

        td.icon {
            font-size: 1.5rem;

            span.up {
                color: green;
            }

            span.down {
                color: red;
            }
        }
    }

    p.note {
        color: ${(props) => props.theme.colorLightText};
        font-size: 0.7em;
        margin: 2em 0 0 0;
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
        }

        span.up {
            padding-right: 0.3rem;
            color: #036b03;
        }

        span.down {
            padding-right: 0.3rem;
            color: #ff0000b5;
        }

        th.vertical {
            padding-bottom: 1rem;
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
