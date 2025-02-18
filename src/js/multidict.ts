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
import { AnyInterface, ListOfPairs } from './types.js';


type AcceptedValue = string|number|boolean;

/**
 * MultiDict provides a multi-value dictionary  
 */
export class MultiDict {

    private readonly data:{[k:string]:Array<string>};

    constructor(data?:ListOfPairs|AnyInterface<{}>|{[key:string]:AcceptedValue|Array<AcceptedValue>}) {
        this.data = {};
        if (Array.isArray(data)) {
            for (let i = 0; i < data.length; i += 1) {
                const k = data[i][0];
                const v = data[i][1];
                if (this.data[k] === undefined) {
                    this.data[k] = [];
                }
                this.data[k].push(this.importValue(v));
            }

        } else if (data !== null && data !== undefined) {
            Object.keys(data).forEach(k => {
                if (Array.isArray(data[k])) {
                    this.data[k] = data[k];

                } else {
                    this.data[k] = [data[k]];
                }
            });
        }
    }

    private importValue(s:AcceptedValue):string {
        if (typeof s === 'number') {
            return s.toString();

        } else if (typeof s === 'boolean') {
            return s ? '1' : '0';
        }
        return s;
    }

    static isMultiDict(v:any):v is MultiDict {
        return v instanceof MultiDict;
    }

    size():number {
        let ans = 0;
        for (let p in this.data) {
            if (this.data.hasOwnProperty(p)) {
                ans += 1;
            }
        }
        return ans;
    }

    getFirst(key:string):string|undefined {
        return this.data[key] !== undefined ? this.data[key][0] : undefined;
    }

    getList(key:string):Array<string> {
        return this.data[key] !== undefined ? this.data[key] : [];
    }

    /**
     * Set a new value. In case there is
     * already a value present it is removed
     * first.
     */
    set(key:string, value:AcceptedValue):void {
        this.data[key] = [this.importValue(value)];
    }

    /**
     * Replace the current list of values
     * associated with the specified key
     * with a provided list of values.
     */
    replace(key:string, values:Array<string>):void {
        if (values.length > 0) {
            this.data[key] = values || [];

        } else {
            this.remove(key);
        }
    }

    remove(key:string):void {
        delete this.data[key];
    }

    /**
     * Add a new value. Traditional
     * dictionary mode rewrites current value
     * but the 'multi-value' mode appends the
     * value to the list of existing ones.
     */
    add(key:string, value:any):void {
        if (this.data[key] === undefined) {
            this.data[key] = [];
        }
        this.data[key].push(value);
    }

    /**
     * Return a list of key-value pairs.
     */
    items():Array<[string, string]> {
        let ans:Array<[string, string]> = [];
        for (let p in this.data) {
            if (this.data.hasOwnProperty(p)) {
                for (let i = 0; i < this.data[p].length; i += 1) {
                    ans.push([p, this.data[p][i]]);
                }
            }
        }
        return ans;
    }

    has(key:string) {
        return this.data.hasOwnProperty(key);
    }
}
