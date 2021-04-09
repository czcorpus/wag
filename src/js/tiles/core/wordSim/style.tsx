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


export const WordSimView = styled.div`
    height: 100%;
`;

export const Boxes = styled.div<{isMobile:boolean}>`
    height: 100%;
    overflow-y: hidden;
    overflow-x: auto;
    display: flex;
    align-items: stretch;
    justify-content: space-between;
    flex-direction: row;
    flex-wrap: ${props => props.isMobile ? 'wrap' : 'nowrap'};

    & > .chart {
        min-width: 50%;
    }

    & > div:not(:last-child) {
        margin-right: 0.7em;
    }

    ${theme.mediaMediumScreen} {
        & > .chart {
            min-width: initial;
            width: 100%;
        }
    }
`;

export const SimCloud = styled.div`
    height: 100%;
    display: flex;
    flex-direction: column;

    h2 {
        text-align: center;
        font-weight: normal;
        font-size: 1.4em;
        padding-bottom: 0.3em;
        padding-left: 0.7em;
        border-color: ${theme.colorLightGrey};
        border-style: solid;
        border-width: 0 0 1px 0;
        margin: 0 0.5em 1em 0.5em;
    }
`;

export const Controls = styled.form`
    margin-bottom: 0.7em;
`;
