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

export const FreqComparisonTile = styled.div`
    min-height: 15em;
`;

export const Charts = styled.div<{incomplete: boolean; isMobile: boolean;}>`
    display: flex;
    flex-direction: row;
    align-items: flex-end;
    overflow-x: auto;
    overflow-y: hidden;
    justify-content: ${props => props.incomplete ? 'flex-start' : 'space-between'};
    flex-wrap: ${props => props.isMobile ? 'nowrap' : 'wrap'};

    & > *:not(:last-child) {
        box-sizing: border-box;
        padding-right: 10px;
    }

    h3 {
        margin: 1.5em 0 1.5em 0;
        text-align: center;
        font-weight: normal;
    }
`;

export const Tables = styled.div`
    overflow-x: auto;
`;
