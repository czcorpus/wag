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


export const MultiWordTimeDistribTile = styled.div`
    position: relative;

    #zoomResetButton {
        position: absolute;
        right: 1em;
        bottom: 1em;
    }

    .recharts-responsive-container {
        margin: 0 auto;
    }

    p.message {
        margin-top: 0.2em;
        margin-bottom: 0.8em;
    }

    .tweak-box {

        form {
            display: flex;
            align-self: center;
            line-height: 1.8em;

            > *:not(:first-child) {
                margin-left: 1em;
            }

            label > * {
                display: inline-block;
                vertical-align: middle;
            }

            .range {
                font-size: 1.2em;
                padding: 0 0.2em;
            }

            #intervalSelect {
                margin-left: 0.7em;
            }
        }
    }
`;

export const ChartLegend = styled.div`
    text-align: center;

    .caption {
        font-weight: bold;
    }

    .items {
        margin: 0.5em;
    }

    .item {
        font-weight: bold;

        .box {
            display: inline-block;
            margin-right: 0.5em;
            margin-bottom: 0.25em;
            width: 1.5em;
            height: 1.5em;
            vertical-align: middle;
            border-radius: 2px;
        }

    }

    .item:not(:first-child) .box {
        margin-left: 1em;
    }
`;
