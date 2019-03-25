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
import { Observable } from 'rxjs';
import { concatMap, reduce } from 'rxjs/operators';
import { Database } from 'sqlite3';

import { AppServices } from '../../appServices';
import { importQueryPos, LemmaVariant, QueryPoS } from '../../common/types';
import { posTable } from './common';



export const getLemmas = (db:Database, appServices:AppServices, word:string):Observable<Array<LemmaVariant>> => {
    return new Observable<LemmaVariant>((observer) => {
        db.serialize(() => {
            db.each(
                'SELECT col0, col1, col2, `count` AS abs, arf FROM colcounts WHERE col0 = ? ORDER BY arf DESC',
                [word],
                (err, row) => {
                    if (err) {
                        observer.error(err);

                    } else {
                        const pos = importQueryPos(row['col2']);
                        observer.next({
                            word: row['col0'],
                            lemma: row['col1'],
                            abs: row['abs'],
                            ipm: -1,
                            arf: row['arf'],
                            pos: pos,
                            posLabel: appServices.importExternalMessage(posTable[pos]),
                            flevel: -1,
                            isCurrent: false
                        });
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
        })

    }).pipe(
        reduce<LemmaVariant>(
            (acc, curr) => acc.concat([curr]),
            []
        )
    )
};


const getNearFreqItems = (db:Database, appServices:AppServices, val:number, limit:number):Observable<LemmaVariant> => {

    const mkPartialQuery = (whereSgn) => {
        return (
            'SELECT col1, col2, SUM(arf) AS sarf, SUM(`count`) AS abs ' +
            'FROM colcounts ' +
            (whereSgn > 0 ? 'GROUP BY col1, col2 HAVING sarf >= ? ORDER BY sarf ASC' : 'GROUP BY col1, col2 HAVING sarf < ? ORDER BY sarf DESC') + ' ' +
            'LIMIT ?'
        );
    };

    return new Observable<LemmaVariant>((observer) => {
        console.log(`SELECT * FROM (${mkPartialQuery(1)}) UNION SELECT * FROM (${mkPartialQuery(-1)})`);
        db.each(
            `SELECT * FROM (${mkPartialQuery(1)}) UNION SELECT * FROM (${mkPartialQuery(-1)})`,
            [val, limit, val, limit],
            (err, row) => {
                if (err) {
                    observer.error(err);

                } else {
                    observer.next({
                        word: row['col0'],
                        lemma: row['col1'],
                        abs: row['abs'],
                        arf: row['sarf'],
                        ipm: -1,
                        flevel: -1,
                        pos: row['col2'],
                        posLabel: appServices.importExternalMessage(posTable[row['col2']]),
                        isCurrent: false
                    });
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


export const getSimilarFreqWords = (db:Database, appServices:AppServices, word:string, lemma:string, pos:QueryPoS, lft:number, rgt:number):Observable<Array<LemmaVariant>> => {
    return new Observable<LemmaVariant>((observer) => {
        db.get(
            'SELECT col1, col2, SUM(`count`) AS abs, SUM(arf) AS sarf FROM colcounts WHERE col1 = ? AND col2 = ?',
            [lemma, pos],
            (err, row) => {
                if (err) {
                    observer.error(err);

                } else {
                    observer.next({
                        word: row['col0'],
                        lemma: row['col1'],
                        abs: row['abs'],
                        arf: row['sarf'],
                        ipm: -1,
                        flevel: -1,
                        pos: row['col2'],
                        posLabel: appServices.importExternalMessage(posTable[row['col2']]),
                        isCurrent: false
                    });
                    observer.complete();
                }
            }
        );
    }).pipe(
        concatMap(
            ans => getNearFreqItems(db, appServices, ans.arf, Math.abs(lft)),
        ),
        reduce<LemmaVariant>(
            (acc, curr) => acc.concat([curr]),
            []
        )
    );
};