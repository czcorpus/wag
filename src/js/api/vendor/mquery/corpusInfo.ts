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
import { Observable } from 'rxjs';
import { share, map } from 'rxjs/operators';

import { ajax$ } from '../../../page/ajax.js';
import { DataApi, CorpusDetails } from '../../../types.js';
import { IApiServices } from '../../../appServices.js';
import { HTTP, List } from 'cnc-tskit';


interface HTTPResponse {
    corpus: {
        data: {
            corpname:string;
            description:string;
            size:number;
            attrList:Array<{name:string, size:number, description?:string}>;
            structList:Array<{name:string; size:number, description?:string}>;
            textProperties:Array<string>;
            webUrl:string;
            citationInfo?:{
                default_ref:string;
                article_ref:Array<string>;
                other_bibliography:string;
            };
            srchKeywords:Array<string>;
        },
        resultType:'corpusInfo';
        error?:string;
    },
    locale: string;
}

export interface QueryArgs {
    corpname:string;
    lang:string;
}

function findStructSize(data:Array<{name:string, size:number}>, name:string):number|undefined {
    const ans = List.find(v => v.name === name, data);
    return ans ? ans.size : undefined;
}

export class CorpusInfoAPI implements DataApi<QueryArgs, CorpusDetails> {

    private readonly apiURL:string;

    private readonly apiServices:IApiServices;

    constructor(apiURL:string, apiServices:IApiServices) {
        this.apiURL = apiURL;
        this.apiServices = apiServices;
    }

    call(tileId:number, multicastRequest:boolean, args:QueryArgs):Observable<CorpusDetails> {
        return ajax$<HTTPResponse>(
            HTTP.Method.GET,
            this.apiURL + `/info/${args.corpname}`,
            {lang: args.lang},
            {
                headers: this.apiServices.getApiHeaders(this.apiURL),
                withCredentials: true
            }

        ).pipe(
            share(),
            map<HTTPResponse, CorpusDetails>(
                (resp) => ({
                    tileId,
                    title: resp.corpus.data.corpname,
                    description: resp.corpus.data.description,
                    author: '', // TODO
                    href: resp.corpus.data.webUrl,
                    attrList: resp.corpus.data.attrList,
                    citationInfo: {
                        sourceName: resp.corpus.data.corpname,
                        main: resp.corpus.data.citationInfo?.default_ref,
                        papers: resp.corpus.data.citationInfo?.article_ref || [],
                        otherBibliography: resp.corpus.data.citationInfo?.other_bibliography || undefined
                    },
                    structure: {
                        numTokens: resp.corpus.data.size,
                        numSentences: findStructSize(resp.corpus.data.structList, this.apiServices.getCommonResourceStructure(resp.corpus.data.corpname, 'sentence')),
                        numParagraphs: findStructSize(resp.corpus.data.structList, this.apiServices.getCommonResourceStructure(resp.corpus.data.corpname, 'paragraph')),
                        numDocuments: findStructSize(resp.corpus.data.structList, this.apiServices.getCommonResourceStructure(resp.corpus.data.corpname, 'document'))
                    },
                    keywords: List.map(v => ({name: v, color: null}), resp.corpus.data.srchKeywords),
                })
            )
        );
    }
}