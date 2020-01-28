/*
 * Copyright 2018 Tomas Machalek <tomas.machalek@gmail.com>
 * Copyright 2018 Institute of the Czech National Corpus,
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

// NOTE: please note that these functions in general may mutate their
// arguments as we rely on Immer.js working for us when reducing states.


export namespace List {

    export function repeat<T>(fn:()=>T, size:number):Array<T> {
        const ans:Array<T> = [];
        for (let i = 0; i < size; i += 1) {
            ans.push(fn());
        }
        return ans;
    }

    /**
     *
     * @param from lower limit (inclusive)
     * @param to upper limit (exclusive)
     * @param step
     */
    export function range(from:number, to:number, step:number = 1):Array<number> {
        const ans:Array<number> = [];
        for (let i = 0; i < to; i += step) {
            ans.push(i);
        }
        return ans;
    }


    export function findRange<T>(data:Array<T>, cmp:(v1:T, v2:T) => number):[T, T] {
        let min:T = data[0];
        let max:T = data[0];
        data.forEach(v => {
            if (cmp(v, min) < 0) {
                min = v;
            }
            if (cmp(v, max) > 0) {
                max = v;
            }
        });
        return [min, max];
    }

    export function toDict<T>(data:Array<T>):{[key:string]:T} {
        const ans:{[key:string]:T} = {};
        data.forEach((v, i) => {
            ans[i.toFixed()] = v;
        });
        return ans;
    }

    export function maxItem<T>(data:Array<T>, mapper:(v:T)=>number):T {
        let max = data[0];
        for (let i = 1; i < data.length; i++) {
            if (mapper(max) < mapper(data[i])) {
                max = data[i];
            }
        }
        return max;
    }

    export function flatMap<T, U>(data:Array<T>, mapper:(v:T, i:number) => Array<U>):Array<U> {
        return data.reduce(
            (acc, curr, i) => acc.concat(mapper(curr, i)),
            [] as Array<U>
        );
    }

    export function groupBy<V>(data:Array<V>, fn:(v:V, i:number)=>string):Array<[string, Array<V>]> {
        const ans = {} as {[k:string]:Array<V>};
        data.forEach((v, i) => {
            const k = fn(v, i);
            if (ans[k] === undefined) {
                ans[k] = [];
            }
            ans[fn(v, i)].push(v);
        });
        return Dict.toEntries(ans);
    }

    export function sortBy<T>(data:Array<T>, map:(v:T) => number):Array<T> {
        return data.sort((v1, v2) => map(v1) - map(v2));
    }

    /**
     * zipByMappedKey zips multiple arrays containing the same datatype T
     * tranforming them into type U and deciding which items belong together using
     * 'map' function. Because the type U is independent of T also a factory
     * for type U must be provided (dfltFact()). Items of type T are merged into U
     * using importer() function.
     * @param data
     * @param map
     * @param dfltFact
     * @param importer
     */
    export function zipByMappedKey<T, U>(data:Array<Array<T>>, map:(v:T)=>string, dfltFact:()=>U, importer:(dest:U, incom:T, datasetIdx:number)=>U):Array<U> {
        const ans:Array<U> = [];
        const index:{[key:string]:number} = {};

        data.forEach((itemList, datasetIdx) => {
            itemList.forEach(item => {
                const key = map(item);
                if (index[key] === undefined) {
                    ans.push(importer(dfltFact(), item, datasetIdx));
                    index[key] = ans.length - 1;

                } else {
                    ans[index[key]] = importer(ans[index[key]], item, datasetIdx);
                }
            });
        });
        return ans;
    }

}


export namespace Dict {

    export function fromEntries<T>(items:Array<[string, T]>):{[key:string]:T} {
        const ans:{[key:string]:T} = {};
        items.forEach(([k, v]) => {
            ans[k] = v;
        });
        return ans;
    }

    export function toEntries<T>(data:{[key:string]:T}):Array<[string, T]> {
        const ans:Array<[string, T]> = [];
        for (let k in data) {
            ans.push([k, data[k]]);
        }
        return ans;
    }

    export function forEach<T>(data:{[key:string]:T}, fn:(v:T, k:string)=>void):void {
        for (let k in data) {
            fn(data[k], k);
        }
    }

    export function map<T, U>(data:{[key:string]:T}, mapper:(v:T, k:string)=>U):{[key:string]:U} {
        const ans:{[key:string]:U} = {};
        for (let k in data) {
            ans[k] = mapper(data[k], k);
        }
        return ans;
    }

    /**
     * note: function uses strict comparison (===)
     */
    export function hasValue<T>(data:{[key:string]:T}, v:T):boolean {
        for (let k in data) {
            if (data[k] === v) {
                return true;
            }
        }
        return false;
    }

    export function hasKey<T>(data:{[key:string]:T}, k:string):boolean {
        return data[k] !== undefined;
    }

    export function mapEntries<T, U>(data:{[key:string]:T}, mapper:(entry:[string, T])=>U):Array<U> {
        const ans:Array<U> = [];
        for (let k in data) {
            ans.push(mapper([k, data[k]]));
        }
        return ans;
    }

    export function mergeDict<T>(d1:{[key:string]:T}, merger:(oldVal:T, newVal:T, key:string) => T, ...incoming:Array<{[key:string]:T}>):{[key:string]:T} {
        incoming.forEach(d2 => {
            for (let k in d2) {
                if (d1[k] === undefined) {
                    d1[k] = d2[k];

                } else {
                    d1[k] = merger(d1[k], d2[k], k);
                }
            }
        });
        return d1;
    }

}