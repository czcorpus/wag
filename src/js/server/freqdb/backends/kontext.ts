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

import { IFreqDB } from '../freqdb';
import { IAppServices } from '../../../appServices';
import { Observable } from 'rxjs';
import { QueryMatch, calcFreqBand } from '../../../common/query';
import { QuerySelector, HTTPResponse as ConcHTTPResponse, escapeVal } from '../../../common/api/kontext/concordance';
import { HTTPResponse as FreqsHttpResponse } from '../../../common/api/kontext/freqs';
import { map, concatMap } from 'rxjs/operators';
import { List, HTTP } from 'cnc-tskit';
import { FreqDbOptions } from '../../../conf';
import { importQueryPosWithLabel, posTable } from '../../../common/postag';
import { CorpusInfoAPI } from '../../../common/api/kontext/corpusInfo';
import { DummyCache } from '../../../cacheDb';
import { CorpusDetails } from '../../../common/types';
import { serverHttpRequest } from '../../request';


export class KontextFreqDB implements IFreqDB {

    private readonly apiURL:string;

    private readonly srcInfoService:CorpusInfoAPI;

    private readonly corpusSize:number;

    private readonly customHeaders:{[key:string]:string};

    private readonly corpname:string;

    constructor(apiUrl:string, corpusSize:number, options:FreqDbOptions) {
        this.apiURL = apiUrl;
        this.srcInfoService = new CorpusInfoAPI(new DummyCache(), apiUrl, options.httpHeaders);
        this.corpusSize = corpusSize;
        this.corpname = options.urlArgs.corpname;
        this.customHeaders = options.httpHeaders || {};
    }

    private loadConcordance(word:string):Observable<ConcHTTPResponse> {
        return serverHttpRequest<ConcHTTPResponse>({
            url: this.apiURL + 'first',
            method: HTTP.Method.GET,
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
        });
    }

    private loadFreqs(concId:string):Observable<FreqsHttpResponse> {
        return serverHttpRequest<FreqsHttpResponse>({
            url: this.apiURL + 'freqs',
            method: HTTP.Method.GET,
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
        });
    }

    findQueryMatches(appServices:IAppServices, word:string, minFreq:number):Observable<Array<QueryMatch>> {
        return this.loadConcordance(word).pipe(
            concatMap(v => this.loadFreqs(v.conc_persistence_op_id)),
            map(v => List.map(
                item => {
                    const pos = item.Word[1].n; // TODO maybe we should validate just to be sure
                    const ipm = item.freq / this.corpusSize * 1e6;
                    const ans:QueryMatch = {
                        lemma: item.Word[0].n,
                        word: word,
                        pos: importQueryPosWithLabel(pos, posTable, appServices),
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

    getSimilarFreqWords(appServices:IAppServices, lemma:string, pos:Array<string>, rng:number):Observable<Array<QueryMatch>> {
        return new Observable<Array<QueryMatch>>((observer) => {
            observer.next([]);
            observer.complete();
        });
    }

    /**
     * Because Manatee does not provide such a functionality,
     * we return an empty array here.
     */
    getWordForms(appServices:IAppServices, lemma:string, pos:Array<string>):Observable<Array<QueryMatch>> {
        return new Observable<Array<QueryMatch>>((observer) => {
            observer.next([]);
            observer.complete();
        });
    }

    getSourceDescription(uiLang:string, corpname:string):Observable<CorpusDetails> {
        return this.srcInfoService.call({
            tileId: -1,
            corpname: corpname,
            format: 'json'
        });
    }


}