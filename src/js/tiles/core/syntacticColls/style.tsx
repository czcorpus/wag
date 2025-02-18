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

import styled from 'styled-components';
import * as theme from '../../../views/common/theme.js';

export const SyntacticColls = styled.div`

    position:relative;

    .tables {
        display: flex;
        flex-flow: row wrap;
        gap: 10px;
    }

    td.word a {
        cursor: pointer;
    }

`;

export const SCollsWordCloud = styled.div`
    flex-grow: 1;
`;

export const SCollsTable = styled.div`
    flex-grow: 1;

    h2 {
        text-align: center;
        font-size: 1.3em;
    }
`;


export const Examples = styled.div`

    position: absolute;
    top: 4em;
    left: 50%;
    transform: translateX(-50%);
    background-color: #fefefe;
    border: ${theme.defaultBorderStyle};
    border-radius: ${theme.defaultBorderRadius};
    box-shadow: .05em .05em .15em .05em rgba(0, 0, 0, 0.2);
    padding: 0.7em;
    width: 90%;

    > div.texts {
        display: flex;
        flex-direction: column;

        > p {
            margin: 0;
            padding: 0.5em 1em 0.5em 1em;

            strong {
                color: ${theme.colorLogoPink};
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
                color: ${theme.colorLogoPink};
                font-weight: normal;

                span.plus {
                    color: ${theme.colorDefaultText};
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