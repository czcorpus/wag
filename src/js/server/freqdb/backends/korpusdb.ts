/*
 * Copyright 2020 Martin Zimandl <martin.zimandl@gmail.com>
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
import { QuerySelector, HTTPResponse as ConcHTTPResponse, escapeVal } from '../../../api/vendor/kontext/concordance';
import { HTTPResponse as FreqsHttpResponse } from '../../../api/vendor/kontext/freqs';
import { FreqDbOptions } from '../../../conf';
import { importQueryPosWithLabel, posTable } from '../../../postag';
import { CorpusDetails } from '../../../types';
import { serverHttpRequest } from '../../request';


export class KorpusFreqDB implements IFreqDB {

    private readonly apiURL:string;

    private readonly customHeaders:{[key:string]:string};

    constructor(apiUrl:string, apiServices:IApiServices, options:FreqDbOptions) {
        this.apiURL = apiUrl;
        this.customHeaders = options.httpHeaders || {};
    }

    findQueryMatches(appServices:IAppServices, word:string, minFreq:number):Observable<Array<QueryMatch>> {
        return new Observable<Array<QueryMatch>>((observer) => {
            observer.next([]);
            observer.complete();
        });
    }

    getSimilarFreqWords(appServices:IAppServices, lemma:string, pos:Array<string>, rng:number):Observable<Array<QueryMatch>> {
        return new Observable<Array<QueryMatch>>((observer) => {
            observer.next([]);
            observer.complete();
        });
    }

    getWordForms(appServices:IAppServices, lemma:string, pos:Array<string>):Observable<Array<QueryMatch>> {
        return new Observable<Array<QueryMatch>>((observer) => {
            observer.next([]);
            observer.complete();
        });
    }

    getSourceDescription(uiLang:string, corpname:string):Observable<CorpusDetails> {
        return new Observable<CorpusDetails>((observer) => {
            observer.complete();
        });
    }


}