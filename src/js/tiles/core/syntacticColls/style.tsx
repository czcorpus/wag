/*
 * Copyright 2023 Martin Zimandl <martin.zimandl@gmail.com>
 * Copyright 2023 Institute of the Czech National Corpus,
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

export const SyntacticColls = styled.div<{theme:Theme}>`

    position:relative;

    .tables {
        display: flex;
        flex-flow: row wrap;
        gap: 10px;
    }

    td.word a {
        cursor: pointer;
    }

    .hint {
        color: ${props => props.theme.colorLightText};
    }

`;

// -------------------- <SCollsWordCloud /> ----------------------

export const SCollsWordCloud = styled.div`
    flex-grow: 1;
`;

// ------------------- <SCollsTable /> ------------------------

export const SCollsTable = styled.div<{theme:Theme}>`
    flex-grow: 1;

    h2 {
        text-align: center;
        font-size: 1.3em;
    }


    table.data td {

        span {
            padding-left: 0.4em;
            padding-right: 0.4em;
        }

        .arrows {
            color: ${props => props.theme.colorLogoPink};
        }

        .fn {
            color: ${props => props.theme.colorLightText};
        }
    }

    .no-analysis-avail {
        border-radius: ${props => props.theme.tileBorderRadius};
        background-color: ${props => props.theme.colorLightText};
        color: ${props => props.theme.colorInvertText};
        font-size: 1.5em;
        padding: 1em;
        text-align: center;
    }
`;


export const Examples = styled.div<{theme:Theme}>`
    background-color: #fefefe;
    border: ${props => props.theme.defaultBorderStyle};
    border-radius: ${props => props.theme.defaultBorderRadius};
    box-shadow: .05em .05em .15em .05em rgba(0, 0, 0, 0.2);
    padding: 0.5em;

    > div.texts {
        display: flex;
        flex-direction: column;
        max-height: 30em;
        overflow-y: scroll;

        > p {
            margin: 0;
            padding: 0.5em 1em 0.5em 1em;

            strong {
                color: ${props => props.theme.colorLogoPink};
            }
        }

        > p:not(:first-child) {
            border-top: 1px solid #cfcfcf;
        }
    }

    .toolbar {

        display: flex;
        align-items: center;
        margin-bottom: 1em;

        h3 {
            display: flex;
            align-items: center;
            margin: 0;
            padding-left: 1em;

            span.words {
                color: ${props => props.theme.colorLogoPink};
                font-weight: normal;

                span.plus {
                    color: ${props => props.theme.colorDefaultText};
                }
            }
        }

        .controls {
            display: flex;
            align-items: center;
            justify-content: flex-end;
            flex-grow: 1;

            a.close {

                cursor: pointer;

                img {
                    width: 1.5em;
                }
            }
        }
    }
`;


export const Controls = styled.div`

    table {

        border-collapse: collapse;

        td {
            padding: 0.3em 0.6em;
            border-width: 1px;
            border-style: solid;
            border-color: ${props => props.theme.colorLightText};
        }
`;