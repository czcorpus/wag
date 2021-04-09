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


export const MatchingDocsTile = styled.div`
    min-height: 15em;

    .data {
        width: 100%;
    }

    .rowNum {
        min-width: 5%;
    }

    .score {
        min-width: 10%;
    }
`;

export const Paginator = styled.span`
    a {
        cursor: pointer;
    }

    a.disabled {
        cursor: default;
    }

    .arrow {
        width: 1em;
        display: inline-block;
        vertical-align: middle;
    }

    input.page {
        width: 3em;
        margin-left: 0.3em;
        margin-right: 0.3em;
    }
`;
