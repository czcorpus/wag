/*
 * Copyright 2020 Tomas Machalek <tomas.machalek@gmail.com>
 * Copyright 2020 Institute of the Czech National Corpus,
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

import { Dict, pipe, List } from '../common/collections';

export class TileWait<T> {

    private readonly data:{[tileId:string]:T};

    private changed:boolean;

    private constructor(data:{[tileId:string]:T}) {
        this.data = data;
        this.changed = false;
    }

    static create<T>(tilesToWait:Array<number>, valueFactory:(tileId:number)=>T) {
        return new TileWait(pipe(
            tilesToWait,
            List.map<number, [string, T]>(v => [v.toFixed(), valueFactory(v)]),
            Dict.fromEntries()
        ));
    }

    setTileDone(tileId:number, v:T):void {
        if (!this.tileIsRegistered(tileId)) {
            throw new Error(`Tile [${tileId}] is not registered for syncing`);
        }
        this.data[tileId.toFixed()] = v;
        this.changed = true;
    }

    next(pred:(v:T)=>boolean):TileWait<T>|null {
        if (this.changed) {
            return Dict.every(pred, this.data) ? null : new TileWait({...this.data});
        }
        return this;
    }

    tileIsRegistered(tileId:number):boolean {
        return this.data[tileId.toFixed()] !== undefined;
    }

}