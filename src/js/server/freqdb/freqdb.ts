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

import { AppServices } from '../../appServices';
import { importQueryPos, LemmaVariant, QueryPoS } from '../../common/query';
import { posTable } from './common';



export const getLemmas = (db:Database, appServices:AppServices, word:string, minFreq:number):Observable<Array<LemmaVariant>> => {
    return new Observable<LemmaVariant>((observer) => {
        db.serialize(() => {
            db.each(
                'SELECT value, lemma, pos, `count` AS abs, arf FROM word WHERE value = ? AND abs >= ? ORDER BY arf DESC',
                [word.toLowerCase(), minFreq],
                (err, row) => {
                    if (err) {
                        observer.error(err);

                    } else {
                        try {
                            const pos = importQueryPos(row['pos']);
                            observer.next({
                                word: row['value'],
                                lemma: row['lemma'],
                                abs: row['abs'],
                                ipm: -1,
                                arf: row['arf'],
                                pos: [{value: pos, label: appServices.importExternalMessage(posTable[pos])}],
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
        })

    }).pipe(
        reduce(
            (acc:Array<LemmaVariant>, curr:LemmaVariant) => acc.concat([curr]),
            []
        )
    )
};


const exportRow = (row:{[key:string]:any}, appServices:AppServices, isCurrent:boolean, word:string=''):LemmaVariant => ({
    word: word, // TODO different type here ?
    lemma: row['value'],
    abs: row['abs'],
    arf: row['arf'],
    ipm: -1,
    flevel: -1,
    pos: row['pos'].split(',').map((v:string) => ({value: v, label: appServices.importExternalMessage(posTable[v])})),
    isCurrent: isCurrent
});


const ntimesPlaceholder = (n:number):string => {
    const ans = [];
    for (let i = 0; i < n; i += 1) {
        ans.push('?');
    }
    return ans.join(', ');
}


const getNearFreqItems = (db:Database, appServices:AppServices, val:LemmaVariant, whereSgn:number, limit:number):Observable<LemmaVariant> => {

    return new Observable<LemmaVariant>((observer) => {
        db.each(
            'SELECT value, pos, arf, `count` AS abs ' +
            'FROM lemma ' +
            (whereSgn > 0 ? `WHERE is_pname = 0 AND arf >= ? AND (value <> ? OR pos NOT IN (${ntimesPlaceholder(val.pos.length)})) ORDER BY arf ASC` : 'WHERE arf < ? ORDER BY arf DESC') + ' ' +
            'LIMIT ?',
            whereSgn > 0 ? [val.arf, val.lemma, ...val.pos.map(v => v.value), limit] : [val.arf, limit],
            (err, row) => {
                if (err) {
                    observer.error(err);

                } else {
                    observer.next(exportRow(row, appServices, false));
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


export const getSimilarFreqWords = (db:Database, appServices:AppServices, lemma:string, pos:Array<QueryPoS>, rng:number):Observable<Array<LemmaVariant>> => {
    return new Observable<LemmaVariant>((observer) => {
        db.get(
            `SELECT value, GROUP_CONCAT(pos) AS pos, SUM(\`count\`) AS abs, SUM(arf) AS arf
             FROM lemma
             WHERE value = ? AND pos IN (${ntimesPlaceholder(pos.length)}) GROUP BY value`,
            [lemma, ...pos],
            (err, row) => {
                if (err) {
                    observer.error(err);

                } else {
                    observer.next(exportRow(row, appServices, true));
                    observer.complete();
                }
            }
        );
    }).pipe(
        concatMap(
            ans => merge(
                getNearFreqItems(db, appServices, ans, 1, rng),
                getNearFreqItems(db, appServices, ans, -1, rng),
                rxOf(ans)

            )
        ),
        reduce(
            (acc:Array<LemmaVariant>, curr:LemmaVariant) => acc.concat([curr]),
            []
        )
    );
};


export const getWordForms = (db:Database, appServices:AppServices, lemma:string, pos:Array<QueryPoS>):Observable<Array<LemmaVariant>> => {
    return new Observable<LemmaVariant>((observer) => {
        db.each(
            'SELECT w.value AS value, w.pos, w.count AS abs ' +
            'FROM lemma AS m ' +
            'JOIN word AS w ON m.value = w.lemma AND m.pos = w.pos ' +
            `WHERE m.value = ? AND m.pos IN (${ntimesPlaceholder(pos.length)})`,
            [lemma, ...pos],
            (err, row) => {
                if (err) {
                    observer.error(err);

                } else {
                    observer.next(exportRow(row, appServices, true, row['value']));
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
            (acc:Array<LemmaVariant>, curr:LemmaVariant) => acc.concat([curr]),
            []
        )
    );
}