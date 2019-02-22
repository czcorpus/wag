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

import { ListOfPairs, AnyInterface, IMultiDict } from './types';


export class MultiDict<T={}> implements IMultiDict {

    private _data:any;

    constructor(data?:ListOfPairs|AnyInterface<T>|{[key:string]:string|number|Array<string|number>}) {
        this._data = {};
        if (Array.isArray(data)) {
            for (let i = 0; i < data.length; i += 1) {
                let k = data[i][0];
                let v = data[i][1];
                if (this._data[k] === undefined) {
                    this._data[k] = [];
                }
                this._data[k].push(v);
                this[k] = v;
            }

        } else if (data !== null && data !== undefined) {
            Object.keys(data).forEach(k => {
                if (Array.isArray(data[k])) {
                    this._data[k] = data[k];

                } else {
                    this._data[k] = [data[k]];
                }
            });
        }
    }

    size():number {
        let ans = 0;
        for (let p in this._data) {
            if (this._data.hasOwnProperty(p)) {
                ans += 1;
            }
        }
        return ans;
    }

    getFirst(key:string):string {
        return this._data[key] !== undefined ? this._data[key][0] : undefined;
    }

    getList(key:string):Array<string> {
        return this._data[key] !== undefined ? this._data[key] : [];
    }

    /**
     * Set a new value. In case there is
     * already a value present it is removed
     * first.
     */
    set(key:string, value:number|boolean|string):void {
        this[key] = value;
        this._data[key] = [value];
    }

    /**
     * Replace the current list of values
     * associated with the specified key
     * with a provided list of values.
     */
    replace(key:string, values:Array<string>):void {
        if (values.length > 0) {
            this[key] = values[0];
            this._data[key] = values || [];

        } else {
            this.remove(key);
        }
    }

    remove(key:string):void {
        delete this[key];
        delete this._data[key];
    }

    /**
     * Add a new value. Traditional
     * dictionary mode rewrites current value
     * but the 'multi-value' mode appends the
     * value to the list of existing ones.
     */
    add(key:string, value:any):void {
        this[key] = value;
        if (this._data[key] === undefined) {
            this._data[key] = [];
        }
        this._data[key].push(value);
    }

    /**
     * Return a list of key-value pairs.
     */
    items():Array<[string, string]> {
        let ans = [];
        for (let p in this._data) {
            if (this._data.hasOwnProperty(p)) {
                for (let i = 0; i < this._data[p].length; i += 1) {
                    ans.push([p, this._data[p][i]]);
                }
            }
        }
        return ans;
    }

    /**
     * Return a copy of internal dictionary holding last
     * value of each key. If you expect keys with multiple
     * values you should use items() instead.
     */
    toDict():{[key:string]:string} {
        let ans:{[key:string]:any} = {}; // TODO: type mess here
        for (let k in this._data) {
            if (this._data.hasOwnProperty(k)) {
                ans[k] = this._data[k][0];
            }
        }
        return ans;
    }

    has(key:string) {
        return this._data.hasOwnProperty(key);
    }
}


export namespace Forms {

    export interface Input {
        value:string;
        isValid:boolean;
        isRequired:boolean;
        errorDesc?:string;
    }

    export const updateFormInput = (formValue:Input, data:{[P in keyof Input]?: Input[P]}) => {
        return {
            value: data.value !== undefined ? data.value : formValue.value,
            isValid: data.isValid !== undefined ? data.isValid : formValue.isValid,
            isRequired: data.isRequired !== undefined ? data.isRequired : formValue.isRequired,
            errorDesc: data.errorDesc !== undefined ? data.errorDesc : formValue.errorDesc
        };
    };

    export var newFormValue = (v:string, isRequired:boolean):Input => {
        return {value: v, isValid: true, isRequired: isRequired, errorDesc: undefined};
    }

    export var resetFormValue = (formValue:Input, val:string='') => {
        return {value: val, isValid: true, isRequired: formValue.isRequired, errorDesc: undefined};
    };

}

