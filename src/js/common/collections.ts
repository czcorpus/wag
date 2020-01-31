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


type Fn<T, U> = (v:T) => U;
type Obj<V, K extends string> = {[k in K]:V};

export function applyComposed<T, U1>(data:T, op1:Fn<T, U1>):U1;
export function applyComposed<T, U1, U2>(data:T, op1:Fn<T, U1>, op2:Fn<U1, U2>):U2;
export function applyComposed<T, U1, U2, U3>(data:T, op1:Fn<T, U1>, op2:Fn<U1, U2>, op3:Fn<U2, U3>):U3;
export function applyComposed<T, U1, U2, U3, U4>(data:T, op1:Fn<T, U1>, op2:Fn<U1, U2>, op3:Fn<U2, U3>, op4:Fn<U3, U4>):U4;
export function applyComposed<T, U1, U2, U3, U4, U5>(data:T, op1:Fn<T, U1>, op2:Fn<U1, U2>, op3:Fn<U2, U3>, op4:Fn<U3, U4>, op5:Fn<U4, U5>):U5;
export function applyComposed<T, U1, U2, U3, U4, U5, U6>(data:T, op1:Fn<T, U1>, op2:Fn<U1, U2>, op3:Fn<U2, U3>, op4:Fn<U3, U4>, op5:Fn<U4, U5>, op6:Fn<U5, U6>):U6;
export function applyComposed<T, U1, U2, U3, U4, U5, U6, U7>(data:T, op1:Fn<T, U1>, op2:Fn<U1, U2>, op3:Fn<U2, U3>, op4:Fn<U3, U4>, op5:Fn<U4, U5>, op6:Fn<U5, U6>, op7:Fn<U6, U7>):U7;
export function applyComposed<T, U1, U2, U3, U4, U5, U6, U7, U8>(data:T, op1:Fn<T, U1>, op2:Fn<U1, U2>, op3:Fn<U2, U3>, op4:Fn<U3, U4>, op5:Fn<U4, U5>, op6:Fn<U5, U6>, op7:Fn<U6, U7>, op8:Fn<U7, U8>):U8;
export function applyComposed<T, U1, U2, U3, U4, U5, U6, U7, U8, U9>(data:T, op1:Fn<T, U1>, op2:Fn<U1, U2>, op3:Fn<U2, U3>, op4:Fn<U3, U4>, op5:Fn<U4, U5>, op6:Fn<U5, U6>, op7:Fn<U6, U7>, op8:Fn<U7, U8>, op9:Fn<U8, U9>):U9;
export function applyComposed<T>(data:T,...ops:Array<Fn<any, any>>):Fn<any, any> {
    return ops.reduce((prev, fn) => fn(prev), data);
}

export namespace List {

    export function repeat<T>(fn:()=>T, size:number):Array<T> {
        const ans:Array<T> = [];
        for (let i = 0; i < size; i += 1) {
            ans.push(fn());
        }
        return ans;
    }


    export function map<T, U>(fn:(v:T, i:number)=>U):(data:Array<T>)=>Array<U>;
    export function map<T, U>(fn:(v:T, i:number)=>U, data:Array<T>):Array<U>;
    export function map<T, U>(fn:(v:T, i:number)=>U, data?:Array<T>):any {
        const partial = (data2:Array<T>):Array<U> => data2.map(fn);
        return data ? partial(data) : partial;
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


    export function findRange<T>(cmp:(v1:T, v2:T)=>number):(data:Array<T>)=>[T, T];
    export function findRange<T>(cmp:(v1:T, v2:T)=>number, data:Array<T>):[T, T];
    export function findRange<T>(cmp:(v1:T, v2:T)=>number, data?:Array<T>):any {
        const partial = (data2:Array<T>):[T, T] => {
            let min:T = data2[0];
            let max:T = data2[0];
            data2.forEach(v => {
                if (cmp(v, min) < 0) {
                    min = v;
                }
                if (cmp(v, max) > 0) {
                    max = v;
                }
            });
            return [min, max];
        };
        return data ? partial(data) : partial;
    }

    export function toDict<T>(data:Array<T>):{[key:string]:T};
    export function toDict<T>():(data:Array<T>)=>{[key:string]:T};
    export function toDict<T>(data?:Array<T>):any {
        const fn = (data2:Array<T>):{[key:string]:T} => {
            const ans:{[key:string]:T} = {};
            data2.forEach((v, i) => {
                ans[i.toFixed()] = v;
            });
            return ans;
        };
        return data ? fn(data) : fn;
    }

    export function maxItem<T>(mapper:(v:T)=>number, data:Array<T>):T;
    export function maxItem<T>(mapper:(v:T)=>number):(data:Array<T>)=>T;
    export function maxItem<T>(mapper:(v:T)=>number, data?:Array<T>):any {
        const fn = (data2:Array<T>):T => {
            let max = data[0];
            for (let i = 1; i < data2.length; i++) {
                if (mapper(max) < mapper(data2[i])) {
                    max = data2[i];
                }
            }
            return max;
        };
        return data ? fn(data) : fn;
    }

    export function flatMap<T, U>(mapper:(v:T, i:number) => Array<U>, data:Array<T>):Array<U>;
    export function flatMap<T, U>(mapper:(v:T, i:number) => Array<U>):(data:Array<T>)=>Array<U>;
    export function flatMap<T, U>(mapper:(v:T, i:number) => Array<U>, data?:Array<T>):any {
        const fn = (data2:Array<T>):Array<U> => data2.reduce(
            (acc, curr, i) => acc.concat(mapper(curr, i)),
            [] as Array<U>
        );
        return data ? fn(data) : fn;
    }

    export function reduce<T, U>(reducer:(acc:U, V:T, i:number)=>U, initial:U, data:Array<T>):U;
    export function reduce<T, U>(reducer:(acc:U, V:T, i:number)=>U, initial:U):(data:Array<T>)=>U;
    export function reduce<T, U>(reducer:(acc:U, V:T, i:number)=>U, initial:U, data?:Array<T>):any {
        const fn = (data2:Array<T>):U => data2.reduce((acc, curr, i, _) => reducer(acc, curr, i), initial);
        return data ? fn(data) : fn;
    }


    export function groupBy<T>(mapper:(v:T, i:number)=>string, data:Array<T>):Array<[string, Array<T>]>
    export function groupBy<T>(mapper:(v:T, i:number)=>string):(data:Array<T>)=>Array<[string, Array<T>]>
    export function groupBy<T>(mapper:(v:T, i:number)=>string, data?:Array<T>):any {
        const fn = (data2:Array<T>):Array<[string, Array<T>]> => {
            const ans = {} as {[k:string]:Array<T>};
            data2.forEach((v, i) => {
                const k = mapper(v, i);
                if (ans[k] === undefined) {
                    ans[k] = [];
                }
                ans[mapper(v, i)].push(v);
            });
            return Dict.toEntries(ans);
        };
        return data ? fn(data) : fn;
    }


    export function sortBy<T>(map:(v:T) => number, data:Array<T>):Array<T>;
    export function sortBy<T>(map:(v:T) => number):(data:Array<T>)=>Array<T>;
    export function sortBy<T>(map:(v:T) => number, data?:Array<T>):any {
        const fn = (data2:Array<T>):Array<T> => data2.sort((v1, v2) => map(v1) - map(v2));
        return data ? fn(data) : fn;
    }

    export function filter<T>(pred:(v:T)=>boolean, data:Array<T>):Array<T>;
    export function filter<T>(pred:(v:T)=>boolean):(data:Array<T>)=>Array<T>;
    export function filter<T>(pred:(v:T)=>boolean, data?:Array<T>):any {
        const fn = (data2:Array<T>):Array<T> => data2.filter(pred);
        return data ? fn(data) : fn;
    }

    export function tap<T>(effect:(v:T, i:number)=>void, data:Array<T>):Array<T>;
    export function tap<T>(effect:(v:T, i:number)=>void):(data:Array<T>)=>Array<T>;
    export function tap<T>(effect:(v:T, i:number)=>void, data?:Array<T>):any {
        const fn = (data2:Array<T>):Array<T> => {
            data2.forEach((v, i) => effect(v, i));
            return data2;
        }
        return data ? fn(data) : fn;
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
    export function zipByMappedKey<T, U>(map:(v:T)=>string, dfltFact:()=>U, importer:(dest:U, incom:T, datasetIdx:number)=>U, data:Array<Array<T>>):Array<U>;
    export function zipByMappedKey<T, U>(map:(v:T)=>string, dfltFact:()=>U, importer:(dest:U, incom:T, datasetIdx:number)=>U):(data:Array<Array<T>>)=>Array<U>;
    export function zipByMappedKey<T, U>(map:(v:T)=>string, dfltFact:()=>U, importer:(dest:U, incom:T, datasetIdx:number)=>U, data?:Array<Array<T>>):any {
        const fn = (data2:Array<Array<T>>):Array<U> => {
            const ans:Array<U> = [];
            const index:{[key:string]:number} = {};

            data2.forEach((itemList, datasetIdx) => {
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
        };
        return data ? fn(data) : fn;
    }

    export function shift<T>(data:Array<T>):Array<T>;
    export function shift<T>():(data:Array<T>)=>Array<T>;
    export function shift<T>(data?:Array<T>):any {
        const fn = (data2:Array<T>):Array<T> => {
            data2.splice(0, 1);
            return data2;
        };
        return data ? fn(data) : fn;
    }


    export function addUnique<T>(v:T, data:Array<T>):Array<T>;
    export function addUnique<T>(v:T):(data:Array<T>)=>Array<T>;
    export function addUnique<T>(v:T, data?:Array<T>):any {
        const fn = (data2:Array<T>):Array<T> => {
            const idx = data2.findIndex(item => item === v);
            if (idx < 0) {
                data2.push(v);
            }
            return data2;
        };
        return data ? fn(data) : fn;
    }

    export function removeValue<T>(v:T, data:Array<T>):Array<T>;
    export function removeValue<T>(v:T):(data:Array<T>)=>Array<T>;
    export function removeValue<T>(v:T, data?:Array<T>):any {
        const fn = (data2:Array<T>):Array<T> => {
            const idx = data2.findIndex(item => item === v);
            if (idx > -1) {
                data2.splice(idx, 1);
            }
            return data2;
        };
        return data ? fn(data) : fn;
    }

    export function find<T>(pred:(v:T)=>boolean, data:Array<T>):T|undefined;
    export function find<T>(pred:(v:T)=>boolean):(data:Array<T>)=>T|undefined;
    export function find<T>(pred:(v:T)=>boolean, data?:Array<T>):any {
        const fn = (data2:Array<T>):T|undefined => data2.find(pred);
        return data ? fn(data) : fn;
    }

    export function some<T>(pred:(v:T)=>boolean, data:Array<T>):boolean;
    export function some<T>(pred:(v:T)=>boolean):(data:Array<T>)=>boolean;
    export function some<T>(pred:(v:T)=>boolean, data?:Array<T>):any {
        const fn = (data2:Array<T>):boolean => data2.some(pred);
        return data ? fn(data) : fn;
    }

    export function concat<T>(incoming:Array<T>, data:Array<T>):Array<T>;
    export function concat<T>(incoming:Array<T>):(data:Array<T>)=>Array<T>;
    export function concat<T>(incoming:Array<T>, data?:Array<T>):any {
        const fn = (data2:Array<T>):Array<T> => data2.concat(incoming);
        return data ? fn(data) : fn;
    }
}


export namespace Dict {

    export function fromEntries<V, K extends string>(items:Array<[K, V]>):Obj<V, K>;
    export function fromEntries<V, K extends string>():(item:Array<[K, V]>)=>Obj<V, K>;
    export function fromEntries<V, K extends string>(items?:Array<[K, V]>):any {
        const fn = (items2:Array<[K, V]>):Obj<V, K> => {
            const ans:Obj<V, K> = {} as {[k in K]:V};
            items2.forEach(([k, v]) => {
                ans[k] = v;
            });
            return ans;
        };
        return items ? fn(items) : fn;
    }

    export function toEntries<V, K extends string>(data:Obj<V, K>):Array<[K, V]>;
    export function toEntries<V, K extends string>():(data:Obj<V, K>)=>Array<[K, V]>;
    export function toEntries<V, K extends string>(data?:Obj<V, K>):any {
        const fn = (data2:Obj<V, K>):Array<[K, V]> => {
            const ans:Array<[K, V]> = [];
            for (let k in data2) {
                ans.push([k, data2[k]]);
            }
            return ans;
        };
        return data ? fn(data) : fn;
    }

    export function forEach<V, K extends string>(fn:(v:V, k:K)=>void, data:Obj<V, K>):void {
        for (let k in data) {
            fn(data[k], k);
        }
    }

    export function tap<V, K extends string>(effect:(v:V, k:K)=>void, data:Obj<V, K>):Obj<V, K>;
    export function tap<V, K extends string>(effect:(v:V, k:K)=>void):(data:Obj<V, K>)=>Obj<V, K>;
    export function tap<V, K extends string>(effect:(v:V, k:K)=>void, data?:Obj<V, K>):any {
        const fn = (data2:Obj<V, K>):Obj<V, K> => {
            for (let k in data2) {
                effect(data2[k], k);
            }
            return data2;
        };
        return data ? fn(data) : fn;
    }

    export function map<V, U, K extends string>(mapper:(v:V, k:K)=>U, data:Obj<V, K>):Obj<U, K>;
    export function map<V, U, K extends string>(mapper:(v:V, k:K)=>U):(data:Obj<V, K>)=>Obj<U, K>;
    export function map<V, U, K extends string>(mapper:(v:V, k:K)=>U, data?:Obj<V, K>):any {
        const fn = (data2:Obj<V, K>):Obj<U, K> => {
            const ans:Obj<U, K> = {} as Obj<U, K>;
            for (let k in data2) {
                ans[k] = mapper(data2[k], k);
            }
            return ans;
        };
        return data ? fn(data) : fn;
    }

    export function filter<V, K extends string>(pred:(v:V, k:K)=>boolean, data:Obj<V, K>):Obj<V, K>;
    export function filter<V, K extends string>(pred:(v:V, k:K)=>boolean):(data:Obj<V, K>)=>Obj<V, K>;
    export function filter<V, K extends string>(pred:(v:V, k:K)=>boolean, data?:Obj<V, K>):any {
        const fn = (data2:Obj<V, K>):Obj<V, K> => {
            const ans:Obj<V, K> = {} as Obj<V, K>;
            for (let k in data2) {
                if (pred(data2[k], k)) {
                    ans[k] = data2[k];
                }
            }
            return ans;
        };
        return data ? fn(data) : fn;
    }

    /**
     * note: function uses strict comparison (===)
     */
    export function hasValue<V, K extends string>(v:V, data:Obj<V, K>):boolean;
    export function hasValue<V, K extends string>(v:V):(data:Obj<V, K>)=>boolean;
    export function hasValue<V, K extends string>(v:V, data?:Obj<V, K>):any {
        const fn = (data2:Obj<V, K>):boolean => {
            for (let k in data2) {
                if (data2[k] === v) {
                    return true;
                }
            }
            return false;
        };
        return data ? fn(data) : fn;
    }

    export function hasKey<V, K extends string>(k:string, data:Obj<V, K>):boolean;
    export function hasKey<V, K extends string>(k:string):(data:Obj<V, K>)=>boolean;
    export function hasKey<V, K extends string>(k:string, data?:Obj<V, K>):any {
        const fn = (data2:Obj<V, K>) => data2[k] !== undefined;
        return data ? fn(data) : fn;
    }

    /**
     * Find a key-value pair patching predicate. Order is not defined.
     * If nothing is found, undefined is returned.
     * @param data
     * @param pred
     */
    export function find<V, K extends string>(pred:(v:V, k:K)=>boolean, data:Obj<V, K>):[K, V]|undefined;
    export function find<V, K extends string>(pred:(v:V, k:K)=>boolean):(data:Obj<V, K>)=>[K, V]|undefined;
    export function find<V, K extends string>(pred:(v:V, k:K)=>boolean, data?:Obj<V, K>):any {
        const fn = (data2:Obj<V, K>):[K, V] => {
            for (let k in data2) {
                if (pred(data2[k], k)) {
                    return [k, data2[k]];
                }
            }
            return undefined;
        };
        return data ? fn(data) : fn;
    }

    export function mapEntries<V, U, K extends string>(mapper:(entry:[K, V])=>U, data:Obj<V, K>):Array<U>;
    export function mapEntries<V, U, K extends string>(mapper:(entry:[K, V])=>U):(data:Obj<V, K>)=>Array<U>;
    export function mapEntries<V, U, K extends string>(mapper:(entry:[K, V])=>U, data?:Obj<V, K>):any {
        const fn = (data2:Obj<V, K>):Array<U> => {
            const ans:Array<U> = [];
            for (let k in data2) {
                ans.push(mapper([k, data2[k]]));
            }
            return ans;
        };
        return data ? fn(data) : fn;
    }

    export function mergeDict<V, K extends string>(merger:(oldVal:V, newVal:V, key:K) => V, incoming:Obj<V, K>, data:Obj<V, K>):Obj<V, K>;
    export function mergeDict<V, K extends string>(merger:(oldVal:V, newVal:V, key:K) => V, incoming:Obj<V, K>):(data:Obj<V, K>)=>Obj<V, K>;
    export function mergeDict<V, K extends string>(merger:(oldVal:V, newVal:V, key:K) => V, incoming:Obj<V, K>, data?:Obj<V, K>):any {
        const fn = (data2:Obj<V, K>):Obj<V, K> => {
            for (let k in incoming) {
                if (data2[k] === undefined) {
                    data2[k] = incoming[k];

                } else {
                    data2[k] = merger(data2[k], incoming[k], k);
                }
            }
            return data2;
        };
        return data ? fn(data) : fn;
    }

    export function keys<V, K extends string>(data:Obj<V, K>):Array<K>;
    export function keys<V, K extends string>():(data:Obj<V, K>)=>Array<K>;
    export function keys<V, K extends string>(data?:Obj<V, K>):any {
        const fn = (data2:Obj<V, K>) => Object.keys(data2);
        return data ? fn(data) : fn;
    }

}