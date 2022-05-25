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

/*
 This module provides raw and dirty dummy replacement
 for IndexedDb. Please note that it stores nothing
 and retrieves nothing. It is also functional only
 to the extent that we can using it along with WaG's
 client-side caching.

 This replacement is used typically in case caching
 is explicitly disabled (via WaG config) or in case
 a browser screws something up when initializing
 actual IndexedDB (e.g. FF vs. incognito mode)
*/

import { ILocalDatabase, ILocalStore } from './common';

function isEventListenerObject(v:EventListenerOrEventListenerObject):v is EventListenerObject {
    return 'handleEvent' in v;
}

class DummyRequest<T=any> implements IDBRequest<T> {

    readonly error:DOMException|null;

    onerror:((this:IDBRequest<T>, ev:Event)=>any)|null;

    onsuccess:((this:IDBRequest<T>, ev:Event)=>any)|null;

    /**
     * Returns "pending" until a request is complete, then returns "done".
     */
    readonly readyState:IDBRequestReadyState;

    /**
     * When a request is completed, returns the result, or undefined if the request failed. Throws a "InvalidStateError" DOMException if the request is still pending.
     */
    readonly result:T;

    readonly source:DummyLocalStore;

    readonly transaction:IDBTransaction|null;

    constructor(result:T, src:DummyLocalStore) {
        this.result = result;
        this.source = src;
        this.transaction = null;
        this.readyState = 'done';
    }

    dispatchEvent(event:Event):boolean {
        if (event.type === 'error') {
            this.onerror(event);

        } else if (event.type === 'success') {
            this.onsuccess(event);
        }
        return false; // TODO
    }

    addEventListener(type:string, listener:EventListenerOrEventListenerObject, options?:boolean|AddEventListenerOptions):void {
        if (type === 'error') {
            this.onerror = function (this:IDBRequest<T>, ev:Event) {
                isEventListenerObject(listener) ? listener.handleEvent(ev) :listener(ev);
            }

        } else if (type === 'success') {
            this.onsuccess = function (this:IDBRequest<T>, ev:Event) {
                isEventListenerObject(listener) ? listener.handleEvent(ev) :listener(ev);
            }
        }
    }

    removeEventListener(type:string, listener:EventListenerOrEventListenerObject, options?:boolean|EventListenerOptions):void {
        if (type === 'error') {
            this.onerror = null;

        } else if (type === 'success') {
            this.onsuccess = null;
        }
    }
}

export class DummyLocalStore implements ILocalStore {

    readonly autoIncrement: boolean;

    readonly indexNames:DOMStringList;

    readonly keyPath:string|string[];

    name:string;
    /**
     * Returns the associated transaction.
     */
    readonly transaction: IDBTransaction;

    add(value:any, key?:IDBValidKey):IDBRequest<IDBValidKey> {
        const ans = new DummyRequest(key, this);
        setTimeout(() => {ans.dispatchEvent(new Event('success'))}, 0);
        return ans;
    }

    clear():IDBRequest<undefined> {
        const ans = new DummyRequest(undefined, this);
        setTimeout(() => {ans.dispatchEvent(new Event('success'))}, 0);
        return ans;
    }

    count(key?:IDBValidKey|IDBKeyRange):IDBRequest<number> {
        const ans = new DummyRequest(0, this);
        setTimeout(() => {ans.dispatchEvent(new Event('success'))}, 0);
        return ans;
    }

    createIndex(name:string, keyPath:string|string[], options?:IDBIndexParameters):IDBIndex {
        return null; // TODO
    }

    delete(key:IDBValidKey|IDBKeyRange):IDBRequest<undefined> {
        const ans = new DummyRequest(undefined, this);
        setTimeout(() => {ans.dispatchEvent(new Event('success'))}, 0);
        return ans;
    }

    deleteIndex(name:string):void {
    }

    get(query:IDBValidKey|IDBKeyRange):IDBRequest<any|undefined> {
        const ans = new DummyRequest(undefined, this);
        setTimeout(() => {ans.dispatchEvent(new Event('success'))}, 0);
        return ans;
    }

    getAll(query?:IDBValidKey|IDBKeyRange|null, count?:number): IDBRequest<any[]> {
        const ans = new DummyRequest([], this);
        setTimeout(() => {ans.dispatchEvent(new Event('success'))}, 0);
        return ans;
    }

    getAllKeys(query?:IDBValidKey|IDBKeyRange|null, count?:number):IDBRequest<IDBValidKey[]> {
        const ans = new DummyRequest([], this);
        setTimeout(() => {ans.dispatchEvent(new Event('success'))}, 0);
        return ans;
    }

    getKey(query:IDBValidKey|IDBKeyRange):IDBRequest<IDBValidKey|undefined> {
        const ans = new DummyRequest(undefined, this);
        setTimeout(() => {ans.dispatchEvent(new Event('success'))}, 0);
        return ans;
    }

    index(name:string):IDBIndex {
        return null;
    }

    openCursor(query?:IDBValidKey|IDBKeyRange|null, direction?:IDBCursorDirection):IDBRequest<IDBCursorWithValue|null> {
        const ans = new DummyRequest(null, this);
        setTimeout(() => {ans.dispatchEvent(new Event('success'))}, 0);
        return ans;
    }

    openKeyCursor(query?:IDBValidKey|IDBKeyRange|null, direction?:IDBCursorDirection):IDBRequest<IDBCursor|null> {
        const ans = new DummyRequest(null, this);
        setTimeout(() => {ans.dispatchEvent(new Event('success'))}, 0);
        return ans;
    }

    put(value:any, key?:IDBValidKey):IDBRequest<IDBValidKey> {
        const ans = new DummyRequest(key, this);
        setTimeout(() => {ans.dispatchEvent(new Event('success'))}, 0);
        return ans;
    }
}


export class DummyTransaction implements IDBTransaction {

    readonly db:IDBDatabase;

    readonly error:DOMException;

    readonly mode: IDBTransactionMode;

    readonly objectStoreNames:DOMStringList;

    readonly durability:"default";

    onabort:((this:IDBTransaction, ev:Event)=>any)|null;

    oncomplete:((this:IDBTransaction, ev:Event)=>any)|null;

    onerror:((this:IDBTransaction, ev:Event)=>any)|null;

    abort():void {
    }

    objectStore(name:string):IDBObjectStore {
        return new DummyLocalStore();
    }

    dispatchEvent(event:Event):boolean {
        if (event.type === 'error') {
            this.onerror(event);

        } else if (event.type === 'complete') {
            this.oncomplete(event);

        } else if (event.type === 'abort') {
            this.onabort(event);
        }
        return false; // TODO
    }

    addEventListener(type:string, listener:EventListenerOrEventListenerObject, options?:boolean|AddEventListenerOptions):void {
        if (type === 'error') {
            this.onerror = function (this:IDBTransaction, ev:Event) {
                isEventListenerObject(listener) ? listener.handleEvent(ev) :listener(ev);
            }

        } else if (type === 'complete') {
            this.oncomplete = function (this:IDBTransaction, ev:Event) {
                isEventListenerObject(listener) ? listener.handleEvent(ev) :listener(ev);
            }

        } else if (type === 'abort') {
            this.onabort = function (this:IDBTransaction, ev:Event) {
                isEventListenerObject(listener) ? listener.handleEvent(ev) :listener(ev);
            }
        }
    }

    removeEventListener(type:string, listener:EventListenerOrEventListenerObject, options?:boolean|EventListenerOptions):void {
        if (type === 'error') {
            this.onerror = null;

        } else if (type === 'complete') {
            this.oncomplete = null;

        } else if (type === 'abort') {
            this.onabort = null;
        }
    }

    commit(): void {
    }
}

export class DummyLocalDb implements ILocalDatabase {

    close():void {
    }

    createObjectStore(name:string, optionalParameters?:IDBObjectStoreParameters):ILocalStore {
        return new DummyLocalStore();
    }

    addEventListener(type:string, listener:EventListenerOrEventListenerObject, options?:boolean|AddEventListenerOptions):void {

    }

    transaction(storeNames:string|string[], mode?:IDBTransactionMode):IDBTransaction {
        return new DummyTransaction();
    }
}
