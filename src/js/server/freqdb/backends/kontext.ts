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
import { Observable } from 'rxjs';
import { map, concatMap } from 'rxjs/operators';
import { List, HTTP } from 'cnc-tskit';

import { IFreqDB } from '../freqdb';
import { IAppServices, IApiServices } from '../../../appServices';
import { QueryMatch, calcFreqBand } from '../../../query/index';
import { ConcViewResponse as ConcHTTPResponse, escapeVal } from '../../../api/vendor/kontext/concordance/v015/common';
import { HTTPResponse as FreqsHttpResponse } from '../../../api/vendor/kontext/freqs';
import { FreqDbOptions, MainPosAttrValues } from '../../../conf';
import { importQueryPosWithLabel } from '../../../postag';
import { CorpusInfoAPI } from '../../../api/vendor/kontext/corpusInfo';
import { CorpusDetails } from '../../../types';
import { serverHttpRequest } from '../../request';
import { initDummyStore } from '../../../page/cache/index';


export class KontextFreqDB implements IFreqDB {

    private readonly apiURL:string;

    private readonly srcInfoService:CorpusInfoAPI;

    private readonly corpusSize:number;

    private readonly apiServices:IApiServices;

    private readonly corpname:string;

    constructor(apiUrl:string, corpusSize:number, apiServices:IApiServices, options:FreqDbOptions) {
        this.apiURL = apiUrl;
        this.srcInfoService = new CorpusInfoAPI(initDummyStore('kontext-freqdb'), apiUrl, apiServices);
        this.corpusSize = corpusSize;
        this.corpname = options.urlArgs.corpname;
        this.apiServices = apiServices;
    }

    private loadConcordance(word:string):Observable<ConcHTTPResponse> {
        return serverHttpRequest<ConcHTTPResponse>({
            url: this.apiURL + 'query_submit',
            method: HTTP.Method.POST,
            params: {
                corpname: this.corpname,
                queryselector: 'advanced',
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
            headers: this.apiServices.getApiHeaders(this.apiURL)
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
            headers: this.apiServices.getApiHeaders(this.apiURL)
        });
    }

    findQueryMatches(appServices:IAppServices, word:string, posAttr:MainPosAttrValues, minFreq:number):Observable<Array<QueryMatch>> {
        return this.loadConcordance(word).pipe(
            concatMap(v => this.loadFreqs(v.conc_persistence_op_id)),
            map(v => List.map(
                item => {
                    const pos = item.Word[1].n; // TODO maybe we should validate just to be sure
                    const ipm = item.freq / this.corpusSize * 1e6;
                    const ans:QueryMatch = {
                        lemma: item.Word[0].n,
                        word: word,
                        pos: importQueryPosWithLabel(pos, posAttr, appServices),
                        upos: [], // TODO
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

    getSimilarFreqWords(appServices:IAppServices, lemma:string, pos:Array<string>, posAttr:MainPosAttrValues, rng:number):Observable<Array<QueryMatch>> {
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