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
import * as theme from '../../../views/common/theme';


export const TreqSubsetsView = styled.div`
    .data {
        overflow-x: auto;
        overflow-y: hidden;
    }
`;

export const AltViewTable = styled.table`
    th.word {
        text-align: right;
        padding-right: 0.7em;
        font-weight: normal;
    }

    td {
        text-align: right;
    }
`;

export const ChartLikeTable = styled.table`
    border-spacing: 0;
    border-collapse: collapse;

    td {
        border: 1px solid #aaaaaa;
        padding: 0;

        svg {
            padding: 0;
        }
    }

    th.word {
        text-align: right;
        padding-right: 0.7em;
        padding-left: 0.7em;
        font-weight: normal;
    }

    th.package {
        padding-bottom: 0.7em;
    }

    tr.highlighted {
        background-color: ${theme.colorDataHighlightRow};
    }

    .SimpleBar {
        .bar {
            position: absolute;
            margin-top: 5px;
            margin-bottom: 5px;
        }

        table.grid {
            border-spacing: 0;
            border-collapse: collapse;

            td {
                border-style: solid;
                border-color: #f2f2f2;
                border-width:  0 1px 0 1px;
            }
        }
    }
`;

export const SimpleBar = styled.svg`
    .bar {
        position: absolute;
        margin-top: 5px;
        margin-bottom: 5px;
    }

    table.grid {
        border-spacing: 0;
        border-collapse: collapse;

        td {
            border-style: solid;
            border-color: #f2f2f2;
            border-width:  0 1px 0 1px;
        }
    }
`;
