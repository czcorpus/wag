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

import { Observable, of as rxOf } from 'rxjs';
import { concatMap, map, share, catchError, shareReplay } from 'rxjs/operators';
import { IAsyncKeyValueStore } from '../../types';
import { ILocalDatabase, ILocalStore } from './common';
import { DummyLocalDb } from './dummy';


const DB_VERSION = 1;

const DB_NAME = 'wdglance';


interface CachedRecord<T> {
    created:number;
    data:T;
}


/**
 * Create a ILocaDatabase instance which is (in ideal case)
 * an instance of IDBDatabase. In case the function cannot
 * detect a compatible environment or in case something
 * goes wrong (e.g. Firefox vs. incognito mode) a DummyLocalDb
 * is returned.
 */
export function openDb(storeName:string, maxAge:number):Observable<ILocalDatabase> {
    if (window?.indexedDB !== undefined && maxAge > 0) {
        return new Observable<ILocalDatabase>(
            (observer) => {
                const req = window.indexedDB.open(DB_NAME, DB_VERSION);
                req.addEventListener('success', () => {
                    observer.next(req.result);
                    observer.complete();
                });
                req.addEventListener('error', () => {
                    observer.error(req.error);
                });
                req.addEventListener('upgradeneeded', () => {
                    req.result.createObjectStore(storeName);
                });
            }
        ).pipe(
            catchError(
                (err) => {
                    console.log(`error opening IndexedDB, using a dummy replacement (err: ${err})`);
                    return rxOf(new DummyLocalDb());
                }
            ),
            shareReplay()
        );

    } else {
        console.warn('local data caching disabled');
        return rxOf(new DummyLocalDb()).pipe(share());
    }
}

function begin(db$:Observable<ILocalDatabase>, storeName:string, mode:'readonly'|'readwrite'):Observable<ILocalStore> {
    return db$.pipe(
        concatMap(
            (db) => new Observable<ILocalStore>(
                (observer) => {
                    const transaction = db.transaction(storeName, mode);
                    transaction.addEventListener('complete', () => {
                        observer.complete();
                    });
                    transaction.addEventListener('abort', () => {
                        observer.error(transaction.error);
                    });
                    transaction.addEventListener('error', () => {
                        observer.error(transaction.error);
                    });
                    observer.next(transaction.objectStore(storeName));
                    observer.complete();
                }
            )
        )
    );
}


function getValue<T>(db$:Observable<ILocalDatabase>, maxAge:number, storeName:string, key:string):Observable<T> {
    return begin(db$, storeName, 'readonly').pipe(
        concatMap(
            (store) => new Observable<CachedRecord<T>>(
                (observer) => {
                    const req = store.get(key);
                    req.addEventListener('error', () => {
                        observer.error(req.error);
                    });
                    req.addEventListener('success', () => {
                        observer.next(req.result as CachedRecord<T>);
                        observer.complete();
                    });
                }
            )
        ),
        concatMap(
            (value) => {
                if (value) {
                    if (value.created + maxAge < new Date().getTime() / 1000) {
                        return removeValue(db$, storeName, key).pipe(map(_ => undefined));
                    }
                    return rxOf(value.data);
                }
                return rxOf(undefined);
            }
        )
    );
}


function removeValue(db$:Observable<ILocalDatabase>, storeName:string, key:string):Observable<string> {
    return begin(db$, storeName, 'readwrite').pipe(
        concatMap(
            (store) => new Observable<any>(
                (observer) => {
                    const req = store.delete(key);
                    req.addEventListener('error', () => {
                        observer.error(req.error);
                    });
                    req.addEventListener('success', () => {
                        observer.next(key);
                        observer.complete();
                    });
                }
            )
        )
    );
}


function clearAllValues(db$:Observable<ILocalDatabase>, storeName:string):Observable<number> {
    return begin(db$, storeName, 'readwrite').pipe(
        concatMap(
            (store) => new Observable<{count:number; store:ILocalStore}>(
                (observer) => {
                    const req = store.count();
                    req.addEventListener('error', () => {
                        observer.error(req.error);
                    });
                    req.addEventListener('success', () => {
                        observer.next({count: req.result, store: store});
                        observer.complete();
                    });
                }
            )
        ),
        concatMap(
            ({count, store}) => new Observable<number>(
                (observer) => {
                    const req = store.clear();
                    req.addEventListener('error', () => {
                        observer.error(req.error);
                    });
                    req.addEventListener('success', () => {
                        observer.next(count);
                        observer.complete();
                    });
                }
            )
        )
    );
}


function setValue(db$:Observable<ILocalDatabase>, storeName:string, key:string, value:any):Observable<string> {
    return begin(db$, storeName, 'readwrite').pipe(
        concatMap(
            (store) => new Observable<any>(
                (observer) => {
                    const req = store.put({created: new Date().getTime() / 1000, data: value}, key);
                    req.addEventListener('error', () => {
                        observer.error(req.error);
                    });
                    req.addEventListener('success', () => {
                        observer.next(key);
                        observer.complete();
                    });
                }
            )
        )
    );
}


export function initStore(storeName:string, maxAge:number):IAsyncKeyValueStore {
    const db$ = openDb(storeName, maxAge);
    return {
        get: <T>(key:string) => getValue<T>(db$, maxAge, storeName, key),
        set: (key:string, value:any) => setValue(db$, storeName, key, value),
        clearAll: () => clearAllValues(db$, storeName)
    };
}

export function initDummyStore(storeName:string):IAsyncKeyValueStore {
    const db$ = rxOf(new DummyLocalDb()).pipe(share());
    return {
        get: <T>(key:string) => getValue<T>(db$, 0, storeName, key),
        set: (key:string, value:any) => setValue(db$, storeName, key, value),
        clearAll: () => clearAllValues(db$, storeName)
    };
}
