/*
 * Copyright 2023 Martin Zimandl <martin.zimandl@gmail.com>
 * Copyright 2025 Tomas Machalek <tomas.machalek@gmail.com>
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


import { Dict, List, pipe } from 'cnc-tskit';
import { mkScollExampleLineHash, SCollsExamples } from '../eApi/mquery.js';
import * as S from '../style.js';
import * as React from 'react';

// ------------------- <Examples /> ------------------------

const attrsToStr = (v:{[key:string]:string}):string => pipe(
    v,
    Dict.toEntries(),
    List.map(([k, v]) => `${k}: ${v}`),
    x => x.join(', ')
);

export const Examples:React.FC<{
    data:SCollsExamples;
}> = ({data}) => (
    <S.Examples>
        <h3>
            <span className="words">{data.word1} <span className="plus">+</span> {data.word2}</span>
        </h3>
        <div className="texts">
        {List.map(
            (line, i) => (
                <p key={`${i}:${mkScollExampleLineHash(line)}`}>
                    {List.map(
                        (token, j) => (
                            <React.Fragment key={`t:${i}:${j}`}>
                                {j > 0 ? <span> </span> : ''}
                                {token.strong ?
                                    <strong title={attrsToStr(token.attrs)}>{token.word}</strong> :
                                    <span title={attrsToStr(token.attrs)}>{token.word}</span>
                                }
                            </React.Fragment>
                        ),
                        line.text
                    )}
                </p>
            ),
            data.lines
        )}
        </div>
    </S.Examples>
);
