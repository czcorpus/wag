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

import {Observable} from 'rxjs';
import {reduce} from 'rxjs/operators';
import { LemmaVariant, importQueryPos, QueryPoS } from '../../common/types';
import { AppServices } from '../../appServices';
import { posTable } from './common';
import { Database } from 'sqlite3';


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


export const getSimilarFreqWords = (db:Database, appServices:AppServices, word:string, lemma:string, pos:QueryPoS, lft:number, rgt:number):Observable<Array<LemmaVariant>> => {
    return new Observable<LemmaVariant>((observer) => {
        db.serialize(() => {
            db.each(
                'SELECT col0, col1, col2, `count` AS abs, arf, ' +
                '(SELECT idx FROM colcounts WHERE col0 = ? AND col1 = ? AND col2 = ?) AS srch ' +
                'FROM colcounts ' +
                'WHERE idx >= srch + ? AND idx <= srch + ? ORDER BY idx;',
                [word, lemma, pos, lft, rgt],
                (err, row) => {
                    if (err) {
                        observer.error(err);

                    } else {
                        observer.next({
                            word: row['col0'],
                            lemma: row['col1'],
                            abs: row['abs'],
                            arf: row['arf'],
                            ipm: -1,
                            flevel: -1,
                            pos: row['col2'],
                            posLabel: appServices.importExternalMessage(posTable[pos]),
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

    }).pipe(
        reduce<LemmaVariant>(
            (acc, curr) => acc.concat([curr]),
            []
        )
    );
};