/*
 * Copyright 2019 Tomas Machalek <tomas.machalek@gmail.com>
 * Copyright 2019 Institute of the Czech National Corpus,
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
import { Observable, merge, of as rxOf } from 'rxjs';
import { concatMap, reduce } from 'rxjs/operators';
import { Database } from 'sqlite3';
import { List } from 'cnc-tskit';

import { IAppServices } from '../../../appServices';
import { QueryMatch, calcFreqBand } from '../../../query/index';
import { IFreqDB } from '../freqdb';
import { importQueryPos, importQueryPosWithLabel, posTable } from '../../../postag';
import { SourceDetails } from '../../../types';


/*
For source information, the following table with proper data is needed:

CREATE TABLE source_info (
    corpname TEXT,
    ui_lang TEXT,
    title TEXT,
    description TEXT,
    author TEXT,
    href TEXT,
    citation_source_name TEXT,
    citation_main TEXT,
    citation_paper1 TEXT,
    citation_paper2 TEXT,
    citation_paper3 TEXT,
    citation_other_bibliography TEXT,
    PRIMARY KEY (corpname, ui_lang)
);
*/


export class SqliteFreqDB implements IFreqDB {

    private readonly db:Database;

    private readonly corpusSize:number;


    constructor(dbPath:string, corpusSize:number) {
        this.db = new Database(dbPath);
        this.corpusSize = corpusSize;
    }

    private exportRow(appServices:IAppServices, row:{[key:string]:any}, isCurrent:boolean, word:string=''):QueryMatch {
        return {
            word: word, // TODO different type here ?
            lemma: row['value'],
            abs: row['abs'],
            arf: row['arf'],
            ipm: row['ipm'] !== undefined ? row['ipm'] : -1,
            flevel: null,
            pos: importQueryPosWithLabel(row['pos'], posTable, appServices),
            upos: [], // TODO
            isCurrent: isCurrent
        };
    }

    findQueryMatches(appServices:IAppServices, word:string, minFreq:number):Observable<Array<QueryMatch>> {
        return new Observable<QueryMatch>((observer) => {
            const srchWord = word.toLowerCase();
            if(this.db) {
                this.db.serialize(() => {
                    this.db.each(
                        'SELECT w.value, w.lemma, w.pos, m.`count` AS abs, m.arf, ' +
                        'CAST(m.count AS FLOAT) / ? * 1000000 AS ipm ' +
                        'FROM word AS w ' +
                        'JOIN lemma AS m ON (w.lemma = m.value AND w.pos = m.pos) ' +
                        'WHERE (w.value = ? OR w.lemma = ?) AND m.count >= ? ' +
                        'GROUP BY w.lemma, w.pos ' +
                        'ORDER BY m.arf DESC',
                        [this.corpusSize, srchWord, srchWord, minFreq],
                        (err, row) => {
                            if (err) {
                                observer.error(err);

                            } else {
                                try {
                                    const pos = importQueryPos(row['pos']);
                                    observer.next({
                                        word: srchWord,
                                        lemma: row['lemma'],
                                        abs: row['abs'],
                                        ipm: row['ipm'],
                                        arf: row['arf'],
                                        pos: importQueryPosWithLabel(pos, posTable, appServices),
                                        upos: [], // TODO
                                        flevel: calcFreqBand(row['ipm']),
                                        isCurrent: false
                                    });

                                } catch (err) {
                                    observer.error(err);
                                }
                            }
                        },
                        (err) => {
                            if (err) {
                                observer.error(err);

                            } else {
                                observer.complete();
                            }
                        }
                    );
                });

            } else {
                observer.complete();
            }

        }).pipe(
            reduce(
                (acc:Array<QueryMatch>, curr:QueryMatch) => acc.concat([curr]),
                []
            )
        )
    }

    private getNearFreqItems(appServices:IAppServices, val:QueryMatch, whereSgn:number, limit:number):Observable<QueryMatch> {
        return new Observable<QueryMatch>((observer) => {
            const sql = ['SELECT value, pos, arf, `count` AS abs, CAST(count AS FLOAT) / ? * 1000000 AS ipm FROM lemma WHERE is_pname = 0'];
            const args:Array<any> = [this.corpusSize];
            if (val.pos.length > 0) {
                sql.push('AND (value <> ? OR pos <> ?)');
                args.push(val.lemma, List.map(v => v.value, val.pos).join(' '));

            } else {
                sql.push('AND value <> ?');
                args.push(val.lemma);
            }
            if (whereSgn > 0) {
                sql.push('AND arf >= ?');
                args.push(val.arf);

            } else {
                sql.push('AND arf < ?');
                args.push(val.arf);
            }
            if (whereSgn > 0) {
                sql.push('ORDER BY arf ASC');

            } else {
                sql.push('ORDER BY arf DESC');
            }
            sql.push('LIMIT ?');
            args.push(limit);
            this.db.each(sql.join(' '), args,
                (err, row) => {
                    if (err) {
                        observer.error(err);

                    } else {
                        observer.next(this.exportRow(appServices, row, false));
                    }
                },
                (err) => {
                    if (err) {
                        observer.error(err);

                    } else {
                        observer.complete();
                    }
                }
            );
        });
    }

    getSimilarFreqWords(appServices:IAppServices, lemma:string, pos:Array<string>, rng:number):Observable<Array<QueryMatch>> {
        return new Observable<QueryMatch>((observer) => {
            const sql = ['SELECT value, pos, SUM(`count`) AS abs, CAST(`count` AS FLOAT) / ? * 1000000 AS ipm, SUM(arf) AS arf ' +
                            'FROM lemma WHERE value = ?'];
            const args:Array<any> = [this.corpusSize, lemma];
            if (pos.length > 0) {
                sql.push('AND pos = ?');
                args.push(pos.join(' '));
            }
            this.db.get(
                sql.join(' '), args,
                (err, row) => {
                    if (err) {
                        observer.error(err);

                    } else {
                        observer.next(this.exportRow(appServices, row, true));
                        observer.complete();
                    }
                }
            );
        }).pipe(
            concatMap(
                ans => merge(
                    this.getNearFreqItems(appServices, ans, 1, rng),
                    this.getNearFreqItems(appServices, ans, -1, rng),
                    rxOf(ans)

                )
            ),
            reduce(
                (acc:Array<QueryMatch>, curr:QueryMatch) => acc.concat([curr]),
                []
            )
        );
    }

    getWordForms(appServices:IAppServices, lemma:string, pos:Array<string>):Observable<Array<QueryMatch>> {
        return new Observable<QueryMatch>((observer) => {
            this.db.each(
                'SELECT w.value AS value, w.pos, w.count AS abs, CAST(w.count AS FLOAT) / ? * 1000000 AS ipm ' +
                'FROM lemma AS m ' +
                'JOIN word AS w ON m.value = w.lemma AND m.pos = w.pos ' +
                `WHERE m.value = ? AND m.pos = ?`,
                [this.corpusSize, lemma, pos.join(' ')],
                (err, row) => {
                    if (err) {
                        observer.error(err);

                    } else {
                        observer.next(this.exportRow(appServices, row, true, row['value']));
                    }
                },
                (err) => {
                    if (err) {
                        observer.error(err);

                    } else {
                        observer.complete();
                    }
                }
            );
        }).pipe(
            reduce(
                (acc:Array<QueryMatch>, curr:QueryMatch) => acc.concat([curr]),
                []
            )
        );
    }

    getSourceDescription(uiLang:string, corpname:string):Observable<SourceDetails> {
        return new Observable<SourceDetails>((observer) => {
            this.db.each(
                'SELECT corpname, ui_lang, title, description, author, href, citation_source_name, ' +
                'citation_paper1, citation_paper2, citation_paper3, citation_main, citation_other_bibliography ' +
                'FROM source_info ' +
                `WHERE corpname = ? AND ui_lang = ?`,
                [corpname, uiLang],
                (err, row) => {
                    if (err) {
                        observer.error(err);

                    } else {
                        observer.next({
                            tileId: -1,
                            title: row['title'],
                            description: row[''],
                            author:  row[''],
                            href: row[''],
                            citationInfo: {
                                sourceName: row['citation_source_name'],
                                main: row['citation_main'],
                                papers: List.filter(v => !!v, [row['citation_paper1'], row['citation_paper2'], row['citation_paper3']]),
                                otherBibliography: row['citation_other_bibliography']
                            }
                        });
                        observer.complete();
                    }
                },
                (err) => {
                    if (err) {
                        observer.error(err);

                    } else {
                        observer.error(`Unknown freq. db. error for arguments uiLang: ${uiLang}, corpname: ${corpname}`);
                    }
                }
            );
        });
    }
}