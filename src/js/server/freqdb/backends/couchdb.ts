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
import { Observable, merge, empty, forkJoin, of as rxOf } from 'rxjs';
import { concatMap, reduce, map, catchError } from 'rxjs/operators';
import { List, pipe, HTTP, tuple } from 'cnc-tskit';

import { IAppServices } from '../../../appServices';
import { QueryMatch, calcFreqBand } from '../../../common/query';
import { IFreqDB } from '../freqdb';
import { FreqDbOptions } from '../../../conf';
import { serverHttpRequest } from '../../request';
import { importQueryPosWithLabel, posTable, posTagsEqual } from '../../../common/postag';
import { SourceDetails } from '../../../common/types';


/*
CouchDB as an internal word frequency database for WaG

Document structure:

{
    "lemma":"asi",
    "forms":[
        {"word":"asi","count":66556,"arf":34748.076}
    ],
    "pos":"T",
    "arf":34748.076,
    "is_pname":false,
    "count":66556
}
*/

enum Views {

    /*
    function (doc) {
    emit(doc.arf, 1);
    }
    */
    BY_ARF = 'by-arf',

    BY_ARF_1G = '1g-by-arf',

    BY_ARF_2G = '2g-by-arf',

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
   BY_WORD = 'by-word'
}

interface HTTPNgramDoc {
    _id:string;
    _rev:string;
    lemma:string;
    pos:string;
    count:number;
    arf:number;
    forms:Array<{
        word:string;
        count:number;
        arf:number;
    }>;
}

interface HTTPNgramResponse {
    total_rows:number;
    offset:number;
    rows:Array<{
        id:string;
        key:string;
        value:number;
        doc:HTTPNgramDoc;
    }>;
}


interface HTTPSourceInfoDoc {
    _id:string;
    _rev:string;
    uiLang:string;
    data:{
        corpname:string;
        description:string;
        size:number;
        web_url:string;
        attrlist:Array<{name:string, size:number}>;
        citation_info:{
            article_ref:Array<string>;
            default_ref:string;
            other_bibliography:string;
        };
        structlist:Array<{name:string; size:number}>;
        keywords:Array<{name:string, color:string}>;
    }
}


interface HTTPSourceInfoResponse {
    total_rows:number;
    offset:number;
    rows:Array<{
        id:string;
        key:string;
        value:number;
        doc:HTTPSourceInfoDoc;
    }>;
}


export class CouchFreqDB implements IFreqDB {

    private readonly dbUrl:string;

    private readonly sourceDbUrl:string|null;

    private readonly dbUser:string;

    private readonly dbPassword:string;

    private readonly corpusSize:number;

    private readonly maxSingleTypeNgramArf:number;

    constructor(dbPath:string, corpusSize:number, options:FreqDbOptions) {
        this.dbUrl = dbPath;
        this.sourceDbUrl = options.sourceInfoUrl || null;
        this.dbUser = options.username;
        this.dbPassword = options.password;
        this.corpusSize = corpusSize;
        if (options.maxSingleTypeNgramArf && options.maxSingleTypeNgramArf > 3) {
            throw new Error('maxSingleTypeNgramArf can be only from {0, 1, 2, 3}');
        }
        this.maxSingleTypeNgramArf = options.maxSingleTypeNgramArf || 0;
    }

    private getViewByLemmaWords(lemma:string):Views.BY_ARF|Views.BY_ARF_1G|Views.BY_ARF_2G|Views.BY_ARF_3G {
        const lemmaLen = lemma.split(' ').length;
        if (lemmaLen <= this.maxSingleTypeNgramArf) {
            switch (lemmaLen) {
                case 1: return Views.BY_ARF_1G;
                case 2: return Views.BY_ARF_2G;
                case 3: return Views.BY_ARF_3G;
            }
        }
        return Views.BY_ARF;
    }

    private queryExact(view:string, value:string):Observable<HTTPNgramResponse> {
        return this.queryServer(view, {key: `"${value}"`});
    }

    private queryServer(view:string, args:{[key:string]:number|string}):Observable<HTTPNgramResponse> {
        return serverHttpRequest<HTTPNgramResponse>({
            url: this.dbUrl + view,
            method: HTTP.Method.GET,
            params: {...args, include_docs: 'true'},
            auth: {
                username: this.dbUser,
                password: this.dbPassword
            }
        }).pipe(
            catchError(
                (err) => {
                    throw new Error(`Failed to fetch frequency information (view: ${view}): ${err}`);
                }
            )
        );
    }

    private mergeDocs(items:Array<{doc:HTTPNgramDoc}>, word:string, appServices:IAppServices):Array<QueryMatch> {
        return pipe(
            items,
            List.map(v => v.doc),
            List.groupBy(v => v._id),
            List.map(([,v]) => v[0]),
            List.map<HTTPNgramDoc, QueryMatch>(v => ({
                word: word,
                lemma: v.lemma,
                pos: importQueryPosWithLabel(v.pos, posTable, appServices),
                abs: v.count,
                ipm: v.count / this.corpusSize * 1e6,
                flevel: calcFreqBand(v.count / this.corpusSize * 1e6),
                arf: v.arf,
                isCurrent: false
            }))
        );
    }

    findQueryMatches(appServices:IAppServices, word:string, minFreq:number):Observable<Array<QueryMatch>> {
        return forkJoin(
            this.queryExact(Views.BY_WORD, word),
            this.queryExact(Views.BY_LEMMA, word)
        ).pipe(
            map(([resp1, resp2]) => this.mergeDocs(List.concat(resp1.rows, resp2.rows), word, appServices))
        )
    }

    getSimilarFreqWords(appServices:IAppServices, lemma:string, pos:Array<string>, rng:number):Observable<Array<QueryMatch>> {
        const view = this.getViewByLemmaWords(lemma);
        return this.queryExact(Views.BY_LEMMA, lemma).pipe(
            concatMap(
                resp => {
                    const srch = List.find(v => v.doc.lemma === lemma && pos.join(' ') === v.doc.pos, resp.rows);
                    return pos.length === 1 && srch ?
                        merge(
                            // we must search for exact frequency separately to prevent
                            // finding the same results in the next two searches and
                            // (worse) by exhausting the search items limit.
                            this.queryServer(
                                view,
                                {
                                    key: srch.doc.arf,
                                    limit: rng
                                }
                            ),
                            this.queryServer(
                                view,
                                {
                                    startkey: srch.doc.arf + srch.doc.arf / 1e5,
                                    limit: rng
                                }
                            ),
                            this.queryServer(
                                view,
                                {
                                    startkey: srch.doc.arf - srch.doc.arf / 1e6,
                                    limit: rng,
                                    descending: 'true'
                                }
                            )
                        ) :
                        empty()
                }
            ),
            map(
                (resp) => List.map(
                    v => v.doc,
                    resp.rows
                )
            ),
            reduce(
                (acc, v) => acc.concat(v),
                [] as Array<HTTPNgramDoc>
            ),
            map(
                values => List.map(
                    v => ({
                        lemma: v.lemma,
                        pos: importQueryPosWithLabel(v.pos, posTable, appServices),
                        ipm: v.count / this.corpusSize * 1e6,
                        flevel: calcFreqBand(v.count / this.corpusSize * 1e6),
                        word: lemma,
                        abs: v.count,
                        arf: v.arf,
                        isCurrent: false
                    }),
                    values
                )
            )
        );
    }

    getWordForms(appServices:IAppServices, lemma:string, pos:Array<string>):Observable<Array<QueryMatch>> {
        return this.queryExact(Views.BY_LEMMA, lemma).pipe(
            map(resp => {
                const srch = pos.length === 0 ?
                    List.filter(
                        v => v.doc.lemma === lemma,
                        resp.rows
                    ) :
                    List.filter(
                        v => v.doc.lemma === lemma && (posTagsEqual(pos, v.doc.pos.split(' '))),
                        resp.rows
                );
                return pipe(
                    srch,
                    List.flatMap(
                        v => List.map(form => tuple(v.doc.pos, form), v.doc.forms)
                    ),
                    List.sortBy(
                        ([,form]) => form.count
                    ),
                    List.map(
                        ([pos, form]) => ({
                            lemma: lemma,
                            pos: importQueryPosWithLabel(pos, posTable, appServices),
                            ipm: form.count / this.corpusSize * 1e6,
                            flevel: calcFreqBand(form.count / this.corpusSize * 1e6),
                            word: form.word,
                            abs: form.count,
                            arf: form.arf,
                            isCurrent: false
                        })
                    )
                )
            })
        );
    }

    getSourceDescription(uiLang:string, corpname:string):Observable<SourceDetails> {
        return this.sourceDbUrl ?
        serverHttpRequest<HTTPSourceInfoResponse>({
            url: this.sourceDbUrl,
            method: HTTP.Method.GET,
            params: {
                key: `"${uiLang}:${corpname}"`,
                include_docs: true
            },
            auth: {
                username: this.dbUser,
                password: this.dbPassword
            }
        }).pipe(
                catchError(
                    (err) => {
                        throw new Error(`Failed to fetch source information for ${uiLang}:${corpname}: ${err}`);
                    }
                ),
                map(resp => {
                    if (resp.rows.length > 0) {
                        return resp.rows[0].doc;
                    }
                    throw new Error(`Failed to find source information for ${corpname}`);
                }),
                map(
                    doc => ({
                        tileId: -1,
                        title: corpname,
                        description: doc.data.description,
                        author: '',
                        citationInfo: {
                            sourceName: doc.data.corpname,
                            main: doc.data.citation_info.default_ref,
                            papers: doc.data.citation_info.article_ref,
                            otherBibliography: doc.data.citation_info.other_bibliography
                        }
                    })
                )
            ) :
            rxOf({
                tileId: -1,
                title: corpname,
                description: 'No detailed information available',
                author: 'not specified'
            })
        }

}