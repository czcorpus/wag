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


export const TimeDistribTile = styled.div`
    p.message {
        margin-top: 0.2em;
        margin-bottom: 0.8em;
    }
`;

export const ChartLegend = styled.p`
    text-align: center;

    .item {

        .box {
            display: inline-block;
            margin-right: 0.4em;
            margin-bottom: 0.2em;
            width: 0.9em;
            height: 0.9em;
            vertical-align: middle;
        }

    }

    .item:not(:first-child) .box {
        margin-left: 1em;
    }
`;
