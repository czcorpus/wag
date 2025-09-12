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
import { CorpusDetails, DataApi } from '../../../../types.js';
import { IDataStreaming } from '../../../../page/streaming.js';
import { Observable } from 'rxjs';
import urlJoin from 'url-join';
import { Dict, HTTP, Ident, List, pipe } from 'cnc-tskit';
import { ajax$ } from '../../../../page/ajax.js';
import { CorpusInfoAPI } from '../../../../api/vendor/mquery/corpusInfo.js';
import { Backlink } from '../../../../page/tile.js';

export interface Token {
    word:string;
    strong:boolean;
    attrs:{ [name:string]:string };
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
            List.map((x) => x.word),
            (x) => x.join(' ')
        ),
    );
}

export interface SCERequestArgs {
    params: {
        corpname:string;
    };
    args: {
        q:string;
    };
}

export interface AttrNamesConf {
    posAttr:string;
    lemmaAttr:string;
    parPosAttr:string;
    parLemmaAttr:string;
    funcAttr:string;
    sentenceStruct:string;
    textStruct?:string;
    textStructAttr?:string;
}

export class SyntacticCollsExamplesAPI implements DataApi<SCERequestArgs, SCollsExamples> {

    private readonly apiURL:string;

    private readonly apiServices:IApiServices;

    private readonly attrNames:AttrNamesConf;

    private readonly srcInfoService:CorpusInfoAPI;

    constructor(
        apiURL:string,
        apiServices:IApiServices,
        attrNames:AttrNamesConf,
    ) {
        this.apiURL = apiURL;
        this.apiServices = apiServices;
        this.attrNames = attrNames;
            this.srcInfoService = new CorpusInfoAPI(apiURL, apiServices);
    }

    makeQuery(
        lemma1:string,
        lemma2:string,
        pos1:string,
        pos2:string,
        func:string,
        distance:number,
        attrValue?:string,
    ):string {
        let q:string;
        if (distance > 1) {
            q = `[${this.attrNames.lemmaAttr}="${lemma2}" & ${this.attrNames.parLemmaAttr}!="${lemma1}"] within (<s/> containing [${this.attrNames.lemmaAttr}="${lemma1}"])`;

        } else if (distance < -1) {
            q = `[${this.attrNames.lemmaAttr}="${lemma2}"] within (<s/> containing [${this.attrNames.lemmaAttr}="${lemma1}" & ${this.attrNames.parLemmaAttr}!="${lemma2}"])`;

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
            q = `[${parts.join(' & ')}]`;
            if (containing.length > 0) {
                q = `${q} within (<s/> containing [${containing.join(' & ')}])`;
            }
        }
        if (attrValue) {
            return `${q} within <${this.attrNames.textStruct} ${this.attrNames.textStructAttr}="${attrValue}"/>`;
        }
        return q;
    }

    call(
        dataStreaming:IDataStreaming | null,
        tileId:number,
        queryIdx:number,
        request:SCERequestArgs,
    ): Observable<SCollsExamples> {
        const url = urlJoin(this.apiURL, 'conc-examples', request.params.corpname);
        if (dataStreaming) {
        return dataStreaming.registerTileRequest<SCollsExamples>({
            tileId,
            method: HTTP.Method.GET,
            url: `${url}?${this.prepareArgs(request)}`,
            body: {},
            contentType: 'application/json'
        });

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
            { ...queryArgs.args, },
            Dict.toEntries(),
            List.filter(([_, v]) => v !== null),
            List.map(([k, v]) => `${k}=${encodeURIComponent(v)}`),
            (x) => x.join('&')
        );
    }


    getSourceDescription(streaming:IDataStreaming, tileId:number, lang:string, corpname:string):Observable<CorpusDetails> {
        return this.srcInfoService.call(streaming, tileId, 0, {corpname, lang});
    }

    getBacklink(queryId:number):Backlink|null {
        return null;
    }
}
