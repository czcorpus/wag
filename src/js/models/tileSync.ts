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

import { Dict, pipe, List } from 'cnc-tskit';

/**
 * TileWait provides a high level abstraction on tile waiting/syncing
 * mechanism.
 */
export class TileWait<T> {

    private readonly data:{[tileId:string]:T};

    private changed:boolean;

    private constructor(data:{[tileId:string]:T}) {
        this.data = data;
        this.changed = false;
    }

    /**
     * create is the factory to create a TileWait instance
     * @param tilesToWait a list of tiles we need to wait for
     * @param valueFactory is a factory function producing a value T we use as a flag for tile status
     */
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

    /**
     * Set syncing object as 'changed'. This can be e.g. used
     * to pass partial loads of the dependee tile through 'suspend()'
     * function while not using it to synchronize (where "tile data loaded"
     * is more suitable).
     */
    touch():void {
        this.changed = true;
    }

    tileIsRegistered(tileId:number):boolean {
        return this.data[tileId.toFixed()] !== undefined;
    }

}