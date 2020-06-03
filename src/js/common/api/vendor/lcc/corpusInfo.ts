/*
 * Copyright 2020 Tomas Machalek <tomas.machalek@gmail.com>
 * Copyright 2020 Institute of the Czech National Corpus,
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
import { Observable, of as rxOf } from 'rxjs';
import { share, map, tap } from 'rxjs/operators';

import { cachedAjax$ } from '../../../ajax';
import { DataApi, HTTPHeaders, SourceDetails, IAsyncKeyValueStore, CorpusDetails } from '../../../types';
import { List } from 'cnc-tskit';


interface CorpusInfo {
    corpusName:string;
    description:string;
    numberOfSentences:number;
    numberOfTypes:number;
    numberOfTokens:number;
    thanksTo:string;
    posTagger:string;
    annotations:string;
}

type HTTPResponse = Array<CorpusInfo>;


export interface QueryArgs {
    tileId:number;
    corpname:string;
}


export class CorpusInfoAPI implements DataApi<QueryArgs, SourceDetails> {

    private readonly apiURL:string;

    private readonly customHeaders:HTTPHeaders;

    private readonly cache:IAsyncKeyValueStore;

    private readonly corpora:{[name:string]:CorpusInfo};

    constructor(cache:IAsyncKeyValueStore, apiURL:string, customHeaders?:HTTPHeaders) {
        this.cache = cache;
        this.apiURL = apiURL;
        this.customHeaders = customHeaders || {};
        this.corpora = {};
    }

    call(args:QueryArgs):Observable<CorpusDetails> {
        return (this.corpora[args.corpname] ?
            rxOf(this.corpora[args.corpname]) :
            cachedAjax$<HTTPResponse>(this.cache)(
                'GET',
                this.apiURL + '/corpora/availableCorpora',
                {},
                {headers: this.customHeaders}
            ).pipe(
                share(),
                map(
                    ans => {
                        const srch = List.find(v => v.corpusName === args.corpname, ans);
                        if (srch) {
                            return srch;

                        } else {
                            return {
                                corpusName: args.corpname,
                                description: '-',
                                numberOfSentences: 0,
                                numberOfTypes: 0,
                                numberOfTokens: 0,
                                thanksTo: '',
                                posTagger: '-',
                                annotations: '-'
                            };
                        }
                    }
                ),
                tap(
                    v => {
                        this.corpora[args.corpname] = v;
                    }
                )
            )
        ).pipe(
            map(
                (info) => ({
                    tileId: args.tileId,
                    title: info.corpusName,
                    description: info.description,
                    author: '',
                    size: info.numberOfTokens,
                    webURL: '',
                    attrList: [],
                    structList: [{name: 'sentence', size: info.numberOfSentences}],
                    keywords: []
                })
            )
        )
    }
}