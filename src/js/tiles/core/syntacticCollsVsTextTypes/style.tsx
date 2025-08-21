/*
 * Copyright 2025 Tomas Machalek <tomas.machalek@gmail.com>
 * Copyright 2025 Institute of the Czech National Corpus,
 *                Faculty of Arts, Charles University
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { styled } from 'styled-components';
import { Theme } from '../../../page/theme.js';


// ---------------- <View /> -------------------------------------

export const View = styled.div`

`;


// ---------------- <SyntacticCollsTT /> --------------------------

export const TableRow = styled.tr<{theme:Theme}>`

    &:hover {
        background-color: ${props => props.theme.colorWhitelikeBlue};
    }

    td, th {
        padding: 0.3em 0.6em;
    }

    td, th {
        border-width: 0 1px 0 0;
        border-style: solid;
        border-color: ${props => props.theme.colorLightText};

        strong {
            display: inline-block;
            padding: 0.4em;
        }
    }

    td.last-cell {
        border: none;
    }

`;

// ---------------- <SingleTTTable /> ----------------------------

export const SingleTTTable = styled.table<{theme:Theme}>`

    border: none;
    border-collapse: collapse;

    .head-row th {
        font-size: 1.3em;
        padding-bottom: 1em;
    }

    thead th {
        padding: 0.3em 0.5em;
        border-width: 0 1px 1px 0;
        border-style: solid;
        border-color: ${props => props.theme.colorLightText};
    }

    thead th.last-cell {
        border-width: 0 0 1px 0;
    }

`;