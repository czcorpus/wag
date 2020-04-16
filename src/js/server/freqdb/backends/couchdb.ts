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
import { Observable, merge, empty, forkJoin } from 'rxjs';
import { concatMap, reduce, map } from 'rxjs/operators';
import { List, pipe } from 'cnc-tskit';
import axios from 'axios';

import { IAppServices } from '../../../appServices';
import { QueryMatch, QueryPoS, calcFreqBand } from '../../../common/query';
import { IFreqDB } from '../freqdb';
import { FreqDbOptions } from '../../../conf';
import { importQueryPosWithLabel, posTable } from '../../../common/postag';


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

Required views:

1) by-arf

function (doc) {
   emit(doc.arf, 1);
}

2) by-lemma

function (doc) {
  emit(doc.lemma, doc.count);
}

3) by-word

function (doc) {
  doc.forms.forEach(function (v) {
    emit(v.word, v.count);
  });
}

*/

interface HTTPResponseDoc {
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

interface HTTPResponse {
    total_rows:number;
    offset:number;
    rows:Array<{
        id:string;
        key:string;
        value:number;
        doc:HTTPResponseDoc;
    }>;
}



export class CouchFreqDB implements IFreqDB {

    private readonly dbUrl:string;

    private readonly dbUser:string;

    private readonly dbPassword:string;

    private readonly corpusSize:number;


    constructor(dbPath:string, corpusSize:number, options:FreqDbOptions) {
        this.dbUrl = dbPath;
        this.dbUser = options.username;
        this.dbPassword = options.password;
        this.corpusSize = corpusSize;
    }

    private queryExact(view:string, value:string):Observable<HTTPResponse> {
        return this.queryServer(view, {key: `"${value}"`});
    }

    private queryServer(view:string, args:{[key:string]:number|string}):Observable<HTTPResponse> {
        return new Observable<HTTPResponse>((observer) => {
            axios.get<HTTPResponse>(
                this.dbUrl + view,
                {
                    params: {...args, include_docs: 'true'},
                    auth: {
                        username: this.dbUser,
                        password: this.dbPassword
                    }
                }
            ).then(
                (resp) => {
                    observer.next(resp.data);
                    observer.complete();
                },
                (err) => {
                    observer.error(new Error(`Failed to fetch frequency information for ${args}: ${err}`));
                }
            );
        });
    }

    private mergeDocs(items:Array<{doc:HTTPResponseDoc}>, word:string, appServices:IAppServices):Array<QueryMatch> {
        return pipe(
            items,
            List.map(v => v.doc),
            List.groupBy(v => v._id),
            List.map(([,v]) => v[0]),
            List.map<HTTPResponseDoc, QueryMatch>(v => ({
                word: word,
                lemma: v.lemma,
                pos: [importQueryPosWithLabel(v.pos, posTable, appServices)],
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
            this.queryExact('by-word', word),
            this.queryExact('by-lemma', word)
        ).pipe(
            map(([resp1, resp2]) => this.mergeDocs(List.concat(resp1.rows, resp2.rows), word, appServices))
        )
    }

    getSimilarFreqWords(appServices:IAppServices, lemma:string, pos:Array<QueryPoS>, rng:number):Observable<Array<QueryMatch>> {
        return this.queryExact('by-lemma', lemma).pipe(
            concatMap(
                resp => {
                    const srch = List.find(v => v.doc.lemma === lemma && pos.indexOf(v.doc.pos as QueryPoS) > -1, resp.rows);
                    return pos.length === 1 && srch ?
                        merge(
                            this.queryServer(
                                'by-arf',
                                {
                                    startkey: srch.doc.arf,
                                    limit: rng
                                }
                            ),
                            this.queryServer(
                                'by-arf',
                                {
                                    startkey: srch.doc.arf,
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
                [] as Array<HTTPResponseDoc>
            ),
            map(
                values => List.map(
                    v => ({
                        lemma: v.lemma,
                        pos: [importQueryPosWithLabel(v.pos, posTable, appServices)],
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

    getWordForms(appServices:IAppServices, lemma:string, pos:Array<QueryPoS>):Observable<Array<QueryMatch>> {
        return this.queryExact('by-lemma', lemma).pipe(
            map(resp => {
                const srch = List.find(v => v.doc.lemma === lemma && pos.indexOf(v.doc.pos as QueryPoS) > -1, resp.rows);
                return pos.length === 1 && srch ?
                    List.map(
                        form => ({
                            lemma: lemma,
                            pos: [importQueryPosWithLabel(srch.doc.pos, posTable, appServices)],
                            ipm: form.count / this.corpusSize * 1e6,
                            flevel: calcFreqBand(form.count / this.corpusSize * 1e6),
                            word: form.word,
                            abs: form.count,
                            arf: form.arf,
                            isCurrent: false
                        }),
                        srch.doc.forms
                    ) :
                    [];
            })
        );
    }

}