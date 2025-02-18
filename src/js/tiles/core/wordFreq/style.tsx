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


export const WordFreqTileView = styled.div`
    display: flex;
    align-items: stretch;
    justify-content: space-between;

    .chart {

        h2 {
            margin: 0 0 0.7em 0;
            font-weight: bold;
            font-size: 1.1em;
            text-align: center;
        }

        width: 340px;
    }

    & > div.cell:not(:last-child) {
        margin-bottom: 1.7em;
    }

    dl.info {

        dt {
            margin-bottom: 0.4em;
            color: ${theme.colorLightText};
            font-family: ${theme.condensedFontFamily};
        }

        dd {
            font-size: 1.5em;
            margin-left: 1em;

            span.squareb {
                color: ${theme.colorLightText};
            }
        }

        dd:not(:last-child) {
            margin-bottom: 0.7em;
        }

        dd.word-list {
            font-size: 1.3em;
            a {
                color: ${theme.colorDefaultText};
                cursor: pointer;
                text-decoration: none;
            }

            a:hover {
                color: ${theme.colorLogoBlue};
                text-decoration: underline;
            }
        }
    }

    ${theme.media.small} {
        flex-direction: column;

        & > div.cell h3 {
            margin-top: 1em;
        }
    }
`;

export const Stars = styled.span`
    display: block;
    white-space: nowrap;

    img {
        width: 1em;
    }
`;

export const MultiWordProfile = styled.div`
    & > table {

        border-spacing: 2px 4px;

        thead th {
            color: ${theme.colorLightText};
            text-align: right;
        }

        td, th {
            padding: 0.4em 0.7em;
            vertical-align: top;
        }

        th.query-num {
            background-color: ${theme.colorLightGrey};
            color: ${theme.colorDefaultText};
            border-radius: 0.3em;
        }

        td.ipm {
            padding-left: 2.5em;
            vertical-align: middle;
        }

        td.band {
            vertical-align: middle;
            text-align: right;
        }

        td.word {
            font-weight: normal;
            text-align: left;
            padding-right: 2.4em;

            dl.info {

                margin-top: 0;

                dd:not(:last-child) {
                    margin-bottom: 0.3em;
                }

                dt {
                    margin-bottom: 0.2em;
                }

                dd {
                    font-size: 1.3em;
                }
            }
        }
    }
`;
