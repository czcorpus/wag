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

import { styled } from 'styled-components';
import { Theme } from '../../../page/theme.js';

export const WordFormView = styled.div<{ theme: Theme }>`
    display: flex;
    flex-direction: column;

    .data-view {
        flex-grow: 1;
        margin-bottom: 1.4em;
    }

    .rare-items-warning {
        margin: 0;
        padding: 0;
        font-size: 0.8em;
        text-align: center;
        color: ${(props) => props.theme.colorLightText};
    }
`;
