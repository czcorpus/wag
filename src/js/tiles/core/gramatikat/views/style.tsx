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

export const SingleWordView = styled.div`
    h2 {
        text-align: center;
        font-size: 1.3em;
    }

    table.data {
        td,
        th {
            padding: 0.4em 0.8em;
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
`;
