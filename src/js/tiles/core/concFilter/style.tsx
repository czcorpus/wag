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
import * as globals from '../../../styles/globals';

export const Sentences = styled.div`
    p {
        margin: 0;
        padding: 0;

        .kwic {
            color: ${globals.colorLogoPink};
        }

        .coll {
            color: ${globals.colorLogoPink};
            font-style: italic;
        }

        a.coll {
            text-decoration: underline;
            cursor: pointer;
        }
    }

    p.aligned {
        margin-top: 0.7em;
    }
`;

export const LineMetadata = styled.div`
    max-width: 30em;
    position: absolute;
    padding: 1em;
    background-color: #FFFFFF;
    margin-left: 0em;
    border-radius: .25em;
    box-shadow: .05em .05em .15em .05em rgba(0,0,0, 0.2);

    dl {
        margin: 0;
        padding: 0;

        dd {
            margin-left: .7em;
            padding-left: 0;

        }

        dt:not(:first-child) {
            margin-top: 0.7em;
        }

        dt {
            font-weight: bold;
            margin-left: 0;
            margin-bottom: 0.2em;
            padding-left: 0;
        }
    }
`;

export const FilteredLine = styled.div`
    padding-left: 0.7em;

    a.info-click {
        cursor: pointer;
        display: inline-block;
        margin-right: 0.7em;
        vertical-align: middle;

        img {
            display: block;
            margin: 0;
            width: 1em;
        }
    }

    .flex {
        padding: 0.4em 0.4em;
        margin: 0;
        display: flex;
        align-items: center;
    }

    .flex.highlighted {
        background-color: ${globals.colorDataHighlightRow};
    }

    &:nth-child(odd) {
        .flex {
            background-color: ${globals.colorWhitelikeBlue};
        }

        .flex.highlighted {
            background-color: ${globals.colorDataHighlightRow};
        }
    }
`;
