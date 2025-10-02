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
import { Observable, merge, forkJoin, of as rxOf, EMPTY } from 'rxjs';
import { concatMap, reduce, map, catchError } from 'rxjs/operators';
import { List, pipe, HTTP, tuple } from 'cnc-tskit';

import { IAppServices, IApiServices } from '../../../../appServices.js';
import { QueryMatch, calcFreqBand } from '../../../../query/index.js';
import { IFreqDB } from '../../freqdb.js';
import { FreqDbOptions, MainPosAttrValues } from '../../../../conf/index.js';
import { serverHttpRequest } from '../../../request.js';
import { importQueryPosWithLabel, posTagsEqual } from '../../../../postag.js';
import { SourceDetails } from '../../../../types.js';
import { CouchStoredSourceInfo } from './sourceInfo.js';

/*
CouchDB as an internal word frequency database for WaG

Document structure:

{
    "lemma":"asi",
    "forms":[
        {"word":"asi","count":66556,"arf":34748.076}
    ],
    "pos":"T",
    "upos": "PART",
    "arf":34748.076,
    "is_pname":false,
    "count":66556
}

Please note that specific views must be defined to make
the database functional along with WaG (see below).
*/

enum Views {
    /*
    function (doc) {
        emit(doc.arf, 1);
    }
    */
    BY_ARF = 'by-arf',

    /*
    function (doc) {
        if (doc.lemma.split(' ').length === 1) {
            emit(doc.arf, null);
        }
    }
    */
    BY_ARF_1G = '1g-by-arf',

    /*
    function (doc) {
        if (doc.lemma.split(' ').length === 2) {
            emit(doc.arf, null);
        }
    }
    */
    BY_ARF_2G = '2g-by-arf',

    /*
    function (doc) {
        if (doc.lemma.split(' ').length === 3) {
            emit(doc.arf, null);
        }
    }
    */
    BY_ARF_3G = '3g-by-arf',

    /*
    function (doc) {
    emit(doc.lemma, doc.count);
    }
    */
    BY_LEMMA = 'by-lemma',

    /*
    function (doc) {
        doc.forms.forEach(function (v) {
            emit(v.word, v.count);
        });
    }
    */
    BY_WORD = 'by-word',
}

interface HTTPNgramDoc {
    _id: string;
    _rev: string;
    lemma: string;
    pos: string;
    upos: string;
    count: number;
    arf: number;
    forms: Array<{
        word: string;
        count: number;
        arf: number;
    }>;
}

interface HTTPNgramResponse {
    total_rows: number;
    offset: number;
    rows: Array<{
        id: string;
        key: string;
        value: number;
        doc: HTTPNgramDoc;
    }>;
}

export class CouchFreqDB implements IFreqDB {
    private readonly dbUrl: string;

    private readonly sourceDbApi: CouchStoredSourceInfo | null;

    private readonly dbUser: string;

    private readonly dbPassword: string;

    private readonly corpusSize: number;

    private readonly maxSingleTypeNgramArf: number;

    constructor(
        dbPath: string,
        corpusSize: number,
        apiServices: IApiServices,
        options: FreqDbOptions
    ) {
        this.dbUrl = dbPath;
        this.sourceDbApi = options.sourceInfoUrl
            ? new CouchStoredSourceInfo(
                  options.sourceInfoUrl,
                  options.username,
                  options.password,
                  apiServices
              )
            : null;
        this.dbUser = options.username;
        this.dbPassword = options.password;
        this.corpusSize = corpusSize;
        if (
            options.maxSingleTypeNgramArf &&
            options.maxSingleTypeNgramArf > 3
        ) {
            throw new Error(
                'maxSingleTypeNgramArf can be only from {0, 1, 2, 3}'
            );
        }
        this.maxSingleTypeNgramArf = options.maxSingleTypeNgramArf || 0;
    }

    private getViewByLemmaWords(
        lemma: string
    ): Views.BY_ARF | Views.BY_ARF_1G | Views.BY_ARF_2G | Views.BY_ARF_3G {
        const lemmaLen = lemma.split(' ').length;
        if (lemmaLen <= this.maxSingleTypeNgramArf) {
            switch (lemmaLen) {
                case 1:
                    return Views.BY_ARF_1G;
                case 2:
                    return Views.BY_ARF_2G;
                case 3:
                    return Views.BY_ARF_3G;
            }
        }
        return Views.BY_ARF;
    }

    private queryExact(
        view: string,
        value: string
    ): Observable<HTTPNgramResponse> {
        return this.queryServer(view, { key: `"${value}"` });
    }

    private queryServer(
        view: string,
        args: { [key: string]: number | string }
    ): Observable<HTTPNgramResponse> {
        return serverHttpRequest<HTTPNgramResponse>({
            url: this.dbUrl + view,
            method: HTTP.Method.GET,
            params: { ...args, include_docs: 'true' },
            auth: {
                username: this.dbUser,
                password: this.dbPassword,
            },
        }).pipe(
            catchError((err) => {
                throw new Error(
                    `Failed to fetch frequency information (view: ${view}, key: ${args['key'] || '??'}): ${err}`
                );
            })
        );
    }

    private mergeDocs(
        items: Array<{ doc: HTTPNgramDoc }>,
        word: string,
        posAttr: MainPosAttrValues,
        appServices: IAppServices
    ): Array<QueryMatch> {
        return pipe(
            items,
            List.map((v) => v.doc),
            List.groupBy((v) => v._id),
            List.map(([, v]) => v[0]),
            List.map<HTTPNgramDoc, QueryMatch>((v) => ({
                word: word,
                lemma: v.lemma,
                pos: importQueryPosWithLabel(v.pos, 'pos', appServices),
                upos: importQueryPosWithLabel(v.upos, 'upos', appServices),
                abs: v.count,
                ipm: (v.count / this.corpusSize) * 1e6,
                flevel: calcFreqBand((v.count / this.corpusSize) * 1e6),
                arf: v.arf,
                isCurrent: false,
            }))
        );
    }

    findQueryMatches(
        appServices: IAppServices,
        word: string,
        posAttr: MainPosAttrValues,
        minFreq: number
    ): Observable<Array<QueryMatch>> {
        return forkJoin([
            this.queryExact(Views.BY_WORD, word),
            this.queryExact(Views.BY_LEMMA, word),
        ]).pipe(
            map(([resp1, resp2]) =>
                this.mergeDocs(
                    List.concat(resp1.rows, resp2.rows),
                    word,
                    posAttr,
                    appServices
                )
            )
        );
    }

    getSimilarFreqWords(
        appServices: IAppServices,
        lemma: string,
        pos: Array<string>,
        posAttr: MainPosAttrValues,
        rng: number
    ): Observable<Array<QueryMatch>> {
        const view = this.getViewByLemmaWords(lemma);
        return this.queryExact(Views.BY_LEMMA, lemma).pipe(
            concatMap((resp) => {
                const srch = List.find(
                    (v) =>
                        v.doc.lemma === lemma &&
                        pos.join(' ') === v.doc[posAttr],
                    resp.rows
                );
                return pos.length === 1 && srch
                    ? merge(
                          // we must search for exact frequency separately to prevent
                          // finding the same results in the next two searches and
                          // (worse) by exhausting the search items limit.
                          this.queryServer(view, {
                              key: srch.doc.arf,
                              limit: rng,
                          }),
                          this.queryServer(view, {
                              startkey: srch.doc.arf + srch.doc.arf / 1e5,
                              limit: rng,
                          }),
                          this.queryServer(view, {
                              startkey: srch.doc.arf - srch.doc.arf / 1e6,
                              limit: rng,
                              descending: 'true',
                          })
                      )
                    : EMPTY;
            }),
            map((resp) => List.map((v) => v.doc, resp.rows)),
            reduce((acc, v) => acc.concat(v), [] as Array<HTTPNgramDoc>),
            map((values) =>
                List.map(
                    (v) => ({
                        lemma: v.lemma,
                        pos: importQueryPosWithLabel(v.pos, 'pos', appServices),
                        upos: importQueryPosWithLabel(
                            v.upos,
                            'upos',
                            appServices
                        ),
                        ipm: (v.count / this.corpusSize) * 1e6,
                        flevel: calcFreqBand((v.count / this.corpusSize) * 1e6),
                        word: lemma,
                        abs: v.count,
                        arf: v.arf,
                        isCurrent: false,
                    }),
                    values
                )
            )
        );
    }

    getWordForms(
        appServices: IAppServices,
        lemma: string,
        pos: Array<string>,
        posAttr: MainPosAttrValues
    ): Observable<Array<QueryMatch>> {
        return this.queryExact(Views.BY_LEMMA, lemma).pipe(
            map((resp) => {
                const srch =
                    pos.length === 0
                        ? List.filter((v) => v.doc.lemma === lemma, resp.rows)
                        : List.filter(
                              (v) =>
                                  v.doc.lemma === lemma &&
                                  posTagsEqual(pos, v.doc.pos.split(' ')),
                              resp.rows
                          );
                return pipe(
                    srch,
                    List.flatMap((v) =>
                        List.map(
                            (form) => tuple(v.doc.pos, v.doc.upos, form),
                            v.doc.forms
                        )
                    ),
                    List.sortBy(([, , form]) => form.count),
                    List.map(([pos, upos, form]) => ({
                        lemma: lemma,
                        pos: importQueryPosWithLabel(pos, 'pos', appServices),
                        upos: importQueryPosWithLabel(
                            upos,
                            'upos',
                            appServices
                        ),
                        ipm: (form.count / this.corpusSize) * 1e6,
                        flevel: calcFreqBand(
                            (form.count / this.corpusSize) * 1e6
                        ),
                        word: form.word,
                        abs: form.count,
                        arf: form.arf,
                        isCurrent: false,
                    }))
                );
            })
        );
    }

    getSourceDescription(
        uiLang: string,
        corpname: string
    ): Observable<SourceDetails> {
        return this.sourceDbApi
            ? this.sourceDbApi.getSourceDescription(uiLang, corpname)
            : rxOf({
                  tileId: -1,
                  title: 'Unknown resource',
                  description: '',
                  author: 'unknown',
                  structure: { numTokens: 0 },
              });
    }
}
