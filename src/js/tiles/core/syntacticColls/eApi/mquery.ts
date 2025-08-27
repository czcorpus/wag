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

import { IApiServices } from '../../../../appServices.js';
import { DataApi } from '../../../../types.js';
import { IDataStreaming } from '../../../../page/streaming.js';
import { Observable } from 'rxjs';
import urlJoin from 'url-join';
import { Dict, HTTP, Ident, List, pipe } from 'cnc-tskit';
import { ajax$ } from '../../../../page/ajax.js';
import { AttrNamesConf } from '../index.js';


export interface Token {
    word:string;
    strong:boolean;
    attrs:{[name:string]:string};
}

export interface ScollExampleLine {
    text:Array<Token>;
}

export interface SCollsExamples {
    lines:Array<ScollExampleLine>;
    word1:string;
    word2:string;
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

export function makeQueryForExampleExtraction(word1:string, word2:string|null, pos1:string|null, pos2:string|null):string {
    if (word2) {
        return `"${word1}"[pos="${pos1 || '*'}"] .. "${word2}"[pos="${pos2 || '*'}"] | "${word2}"[pos="${pos2 || '*'}"] .. "${word1}"[pos="${pos1 || '*'}"]`;
    } else {
        return `"${word1}"[pos="${pos1 || '*'}"]`;
    }
}

export interface SCERequestArgs {
    params:{
        corpname:string;
    }
    args:{
        q:string;
    }
}

export class SyntacticCollsExamplesAPI implements DataApi<SCERequestArgs, SCollsExamples> {

    private readonly apiURL:string;

    private readonly apiServices:IApiServices;

    private readonly attrNames:AttrNamesConf;

    constructor(apiURL:string, apiServices:IApiServices, attrNames:AttrNamesConf) {
        this.apiURL = apiURL;
        this.apiServices = apiServices;
        this.attrNames = attrNames;
    }

    makeQuery(lemma1:string, lemma2:string, pos1:string, pos2:string, func:string, distance:number):string {
        if (distance > 1) {
            return `[${this.attrNames.lemmaAttr}="${lemma2}" & ${this.attrNames.parLemmaAttr}!="${lemma1}"] within (<s/> containing [${this.attrNames.lemmaAttr}="${lemma1}"])`;

        } else if (distance < -1) {
            return `[${this.attrNames.lemmaAttr}="${lemma2}"] within (<s/> containing [${this.attrNames.lemmaAttr}="${lemma1}" & ${this.attrNames.parLemmaAttr}!="${lemma2}"])`;
            
        } else {
            const parts = [];
            const containing = [];
            if (distance > 0) {
                parts.push(`${this.attrNames.lemmaAttr}=\"${lemma2}\"`);
                parts.push(`${this.attrNames.parLemmaAttr}=\"${lemma1}\"`);
                if (pos2) {
                    parts.push(`${this.attrNames.posAttr}=\"${pos2}\"`);
                }
                if (pos1) {
                    parts.push(`${this.attrNames.parPosAttr}=\"${pos1}\"`);
                }
                if (func) {
                    parts.push(`${this.attrNames.funcAttr}=\"${func}\"`);
                }
                
            } else {
                parts.push(`${this.attrNames.lemmaAttr}=\"${lemma2}\"`);
                if (pos2) {
                    parts.push(`${this.attrNames.posAttr}=\"${pos2}\"`);
                }

                containing.push(`${this.attrNames.lemmaAttr}=\"${lemma1}\"`);
                containing.push(`${this.attrNames.parLemmaAttr}=\"${lemma2}\"`);
                if (pos1) {
                    containing.push(`${this.attrNames.posAttr}=\"${pos1}\"`);
                }
                if (pos2) {
                    containing.push(`${this.attrNames.parPosAttr}=\"${pos2}\"`);
                }
                if (func) {
                    containing.push(`${this.attrNames.funcAttr}=\"${func}\"`);
                }               
            }
            if (containing.length > 0) {
                return `[${parts.join(" & ")}] within (<s/> containing [${containing.join(" & ")}])`;
            }
            return `[${parts.join(" & ")}]`;
        }
    }

    call(dataStreaming:IDataStreaming|null, tileId:number, queryIdx:number, request:SCERequestArgs):Observable<SCollsExamples> {
        const url = urlJoin(this.apiURL, 'conc-examples', request.params.corpname);
        if (dataStreaming) {
            return dataStreaming.registerTileRequest<SCollsExamples>(
                {
                    tileId,
                    method: HTTP.Method.GET,
                    url: `${url}?${this.prepareArgs(request)}`,
                    body: {},
                    contentType: 'application/json',
                }
            );

        } else {
            return ajax$<SCollsExamples>(
                HTTP.Method.GET,
                url,
                request.args,
                {
                    headers: this.apiServices.getApiHeaders(this.apiURL),
                    withCredentials: true
                }
            );
        }
    }

    private prepareArgs(queryArgs:SCERequestArgs):string {
        return pipe(
            {
                ...queryArgs.args,
            },
            Dict.toEntries(),
            List.filter(([_, v]) => v !== null),
            List.map(([k, v]) => `${k}=${encodeURIComponent(v)}`),
            x => x.join('&'),
        )
    }
}