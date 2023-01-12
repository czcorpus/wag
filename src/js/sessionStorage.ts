/*
 * Copyright 2022 Tomas Machalek <tomas.machalek@gmail.com>
 * Copyright 2022 Institute of the Czech National Corpus,
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

import { Dict } from 'cnc-tskit';


export interface ISimpleSessionStorage {
    clear():void;
    getItem(key:string):string|null;
    removeItem(key:string):void;
    setItem(key:string, value:string):void;
}


export class DummySessionStorage {

    private readonly data:{[key:string]:string};

    constructor() {
        this.data = {};
    }

    clear():void {
        Dict.forEach(
            (_, k) => {
                delete this.data[k];
            },
            this.data
        );
    }

    getItem(key:string):string|null {
        if (this.data[key] !== undefined) {
            return this.data[key];
        }
        return null;
    }

    removeItem(key:string):void {
        delete this.data[key];
    }

    setItem(key:string, value:string):void {
        this.data[key] = value;
    }
}