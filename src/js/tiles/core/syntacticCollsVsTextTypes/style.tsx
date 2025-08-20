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

export const SyntacticCollsTT = styled.div`

    .boxes {
        display: flex;
        align-items: flex-start;
        flex-wrap: wrap;
    }
`;

export const SingleTTTable = styled.div<{theme:Theme}>`
    border: 1px solid ${props => props.theme.colorLightText};
    margin: 1em;

    td, th {
        padding: 0.2em;
    }
`;