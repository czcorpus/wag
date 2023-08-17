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

import { Ident, List, pipe } from "cnc-tskit";
import { SCollsQueryType, SCollsQueryTypeValue } from "../../api/vendor/mquery/syntacticColls";
import { QueryMatch } from "../../query";

export interface SCollsDataRow {
    word:string;
    freq:number;
    norm:number;
    ipm:number;
    collWeight:number;
}

export interface SCollsData {
    rows:Array<SCollsDataRow>;
    examplesQueryTpl:string;
}

export interface Token {
    word:string;
    strong:boolean;
}

export interface ScollExampleLine {
    text:Array<Token>;
}

export interface SCollsExamples {
    lines:Array<ScollExampleLine>;
}

export function mkScollExampleLineHash(line:ScollExampleLine):string {
    return Ident.hashCode(
        pipe(
            line.text,
            List.map(x => x.word),
            x => x.join(' ')
        )
    );
}

export interface SyntacticCollsModelState {
    isBusy:boolean;
    tileId:number;
    isMobile:boolean;
    isAltViewMode:boolean;
    error:string|null;
    widthFract:number;
    corpname:string;
    queryMatch:QueryMatch;
    data:{[key in SCollsQueryType]?:SCollsData};
    displayTypes:Array<SCollsQueryTypeValue>;
    exampleWindowData:SCollsExamples|undefined; // if undefined, the window is closed
}