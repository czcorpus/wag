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

import { IAppServices } from '../../appServices';
import { importQueryPos, QueryMatch, QueryPoS } from '../../common/query';
import { IFreqDB, posTable } from './freqdb';


function ntimesPlaceholder(n:number):string {
    return List.repeat(() => '?', n).join(', ');
}


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
            flevel: -1,
            pos: List.map<QueryPoS, {value:QueryPoS; label:string}>(
                v => ({
                    value: v,
                    label: appServices.importExternalMessage(posTable[v])
                }),
                row['pos'].split(',')
            ),
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
                                        pos: [{
                                            value: pos,
                                            label: appServices.importExternalMessage(posTable[pos])
                                        }],
                                        flevel: -1,
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

    getNearFreqItems(appServices:IAppServices, val:QueryMatch, whereSgn:number, limit:number):Observable<QueryMatch> {
        return new Observable<QueryMatch>((observer) => {
            this.db.each(
                'SELECT value, pos, arf, `count` AS abs, CAST(count AS FLOAT) / ? * 1000000 AS ipm ' +
                'FROM lemma ' +
                (whereSgn > 0 ?
                    `WHERE is_pname = 0 AND arf >= ? AND (value <> ? OR pos NOT IN (${ntimesPlaceholder(val.pos.length)})) ORDER BY arf ASC` :
                    'WHERE is_pname = 0 AND arf < ? ORDER BY arf DESC') + ' ' +
                'LIMIT ?',
                whereSgn > 0 ?
                    [this.corpusSize, val.arf, val.lemma, ...val.pos.map(v => v.value), limit] :
                    [this.corpusSize, val.arf, limit],
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

    getSimilarFreqWords(appServices:IAppServices, lemma:string, pos:Array<QueryPoS>, rng:number):Observable<Array<QueryMatch>> {
        return new Observable<QueryMatch>((observer) => {
            this.db.get(
                `SELECT value, GROUP_CONCAT(pos) AS pos, SUM(\`count\`) AS abs, CAST(\`count\` AS FLOAT) / ? * 1000000 AS ipm, SUM(arf) AS arf
                FROM lemma
                WHERE value = ? AND pos IN (${ntimesPlaceholder(pos.length)}) GROUP BY value`,
                [this.corpusSize, lemma, ...pos],
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

    getWordForms(appServices:IAppServices, lemma:string, pos:Array<QueryPoS>):Observable<Array<QueryMatch>> {
        return new Observable<QueryMatch>((observer) => {
            this.db.each(
                'SELECT w.value AS value, w.pos, w.count AS abs, CAST(w.count AS FLOAT) / ? * 1000000 AS ipm ' +
                'FROM lemma AS m ' +
                'JOIN word AS w ON m.value = w.lemma AND m.pos = w.pos ' +
                `WHERE m.value = ? AND m.pos IN (${ntimesPlaceholder(pos.length)})`,
                [this.corpusSize, lemma, ...pos],
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
}