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

import axios from 'axios';

import { IFreqDB, posTable } from '../freqdb';
import { IAppServices } from '../../../appServices';
import { Observable } from 'rxjs';
import { QueryMatch, QueryPoS, calcFreqBand } from '../../../common/query';
import { QuerySelector, HTTPResponse as ConcHTTPResponse, escapeVal } from '../../../common/api/kontext/concordance';
import { HTTPResponse as FreqsHttpResponse } from '../../../common/api/kontext/freqs';
import { map, concatMap } from 'rxjs/operators';
import { List } from 'cnc-tskit';
import { FreqDbOptions } from '../../../conf';

export class KontextFreqDB implements IFreqDB {

    private readonly apiURL:string;

    private readonly corpusSize:number;

    private readonly customHeaders:{[key:string]:string};

    private readonly corpname:string;

    constructor(apiUrl:string, corpusSize:number, options:FreqDbOptions) {
        this.apiURL = apiUrl;
        this.corpusSize = corpusSize;
        this.corpname = options.urlArgs.corpname;
        this.customHeaders = options.httpHeaders || {};
    }

    private loadConcordance(word:string):Observable<ConcHTTPResponse> {
        return new Observable<ConcHTTPResponse>((observer) => {
            axios.get<ConcHTTPResponse>(
                this.apiURL + 'first',
                {
                    params: {
                        corpname: this.corpname,
                        queryselector: QuerySelector.CQL,
                        cql: `[word="${escapeVal(word)}" | lemma="${escapeVal(word)}"]`,
                        kwicleftctx: 1,
                        kwicrightctx: 1,
                        async: '0',
                        pagesize: 1,
                        fromp: 1,
                        attr_vmode: 'direct',
                        attrs: 'word',
                        refs: '',
                        viewmode: 'kwic',
                        shuffle: 0,
                        format:'json'
                    },
                    headers: this.customHeaders
                }
            ).then(
                (resp) => {
                    observer.next(resp.data);
                    observer.complete();

                },
                (err) => {
                    observer.error(err);
                }
            );
        });
    }

    private loadFreqs(concId:string):Observable<FreqsHttpResponse> {
        return new Observable<FreqsHttpResponse>((observer) => {
            axios.get<FreqsHttpResponse>(
                this.apiURL + 'freqs',
                {
                    params: {
                        corpname: this.corpname,
                        q: '~' + concId,
                        flimit: 1,
                        freq_sort: '',
                        fpage: 1,
                        ftt_include_empty: 0,
                        fcrit: 'lemma/e 0<0 pos/e 0<0',
                        format:'json'
                    },
                    headers: this.customHeaders
                }
            ).then(
                (resp) => {
                    observer.next(resp.data);
                    observer.complete();

                },
                (err) => {
                    observer.error(err);
                }
            );
        });
    }

    findQueryMatches(appServices:IAppServices, word:string, minFreq:number):Observable<Array<QueryMatch>> {
        return this.loadConcordance(word).pipe(
            concatMap(v => this.loadFreqs(v.conc_persistence_op_id)),
            map(v => List.map(
                item => {
                    const pos = item.Word[1].n as QueryPoS; // TODO maybe we should validate just to be sure
                    const ipm = item.freq / this.corpusSize * 1e6;
                    const ans:QueryMatch = {
                        lemma: item.Word[0].n,
                        word: word,
                        pos: [{
                            value: pos,
                            label: appServices.importExternalMessage(posTable[pos])
                        }],
                        abs: item.freq,
                        ipm: ipm,
                        arf: -1,
                        flevel: calcFreqBand(ipm),
                        isCurrent: false
                    };
                    return ans;
                },
                v.Blocks[0].Items
            ))
        )
    }

    getSimilarFreqWords(appServices:IAppServices, lemma:string, pos:Array<QueryPoS>, rng:number):Observable<Array<QueryMatch>> {
        return new Observable<Array<QueryMatch>>((observer) => {
            observer.next([]);
            observer.complete();
        });
    }

    getWordForms(appServices:IAppServices, lemma:string, pos:Array<QueryPoS>):Observable<Array<QueryMatch>> {
        return new Observable<Array<QueryMatch>>((observer) => {
            observer.next([]);
            observer.complete();
        });
    }

}