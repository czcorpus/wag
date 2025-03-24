/*
 * Copyright 2018 Tomas Machalek <tomas.machalek@gmail.com>
 * Copyright 2018 Institute of the Czech National Corpus,
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
    corpname:string;
    description:string;
    size:number;
    web_url:string;
    attrlist:Array<{name:string, size:number}>;
    citationInfo?:{
        article_ref:Array<string>;
        default_ref:string;
        other_bibliography:string;
    };
    structlist:Array<{name:string; size:number}>;
    messages:Array<any>; // TODO
    keywords:Array<{name:string, color:string}>;
}

export interface QueryArgs {
    corpname:string;
    format:'json';
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
        const headers = this.apiServices.getApiHeaders(this.apiURL);
        headers['X-Is-Web-App'] = '1';
        return ajax$<HTTPResponse>(
            HTTP.Method.GET,
            this.apiURL + '/corpora/ajax_get_corp_details',
            args,
            {
                headers,
                withCredentials: true
            }

        ).pipe(
            share(),
            map<HTTPResponse, CorpusDetails>(
                (resp) => ({
                    tileId,
                    title: resp.corpname,
                    description: resp.description,
                    author: '', // TODO
                    href: resp.web_url,
                    attrList: resp.attrlist,
                    citationInfo: {
                        sourceName: resp.corpname,
                        main: resp.citationInfo?.default_ref,
                        papers: resp.citationInfo?.article_ref || [],
                        otherBibliography: resp.citationInfo?.other_bibliography || undefined
                    },
                    structure: {
                        numTokens: resp.size,
                        numSentences: findStructSize(resp.structlist, this.apiServices.getCommonResourceStructure(resp.corpname, 'sentence')),
                        numParagraphs: findStructSize(resp.structlist, this.apiServices.getCommonResourceStructure(resp.corpname, 'paragraph')),
                        numDocuments: findStructSize(resp.structlist, this.apiServices.getCommonResourceStructure(resp.corpname, 'document'))
                    },
                    keywords: resp.keywords
                })
            )
        );
    }
}