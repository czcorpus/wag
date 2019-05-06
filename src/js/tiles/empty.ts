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
import { QueryType } from '../common/query';
import { ITileProvider, TileComponent } from '../common/tile';
import { isNullOrUndefined } from 'util';


/**
 * EmptyTile is used as a placeholder in case a configured
 * tile is set as disabled or in case it is enabled but
 * not present in the current (= for the current query type) layout.
 * This allows us to keep always the same mapping "tile" => "numeric ident"
 * and also tile list is always of the same length.
 */
export class EmptyTile implements ITileProvider {

    private readonly tileId:number;

    constructor(tileId:number) {
        this.tileId = tileId;
    }

    getLabel():string {
        return 'empty tile';
    }

    getIdent():number {
        return this.tileId;
    }

    getView():TileComponent {
        return null;
    }

    getSourceInfoView():null {
        return null;
    }

    supportsQueryType(qt:QueryType, lang1:string, lang2?:string):boolean {
        return false;
    }

    disable():void {
    }

    getWidthFract():number {
        return 1;
    }

    supportsTweakMode():boolean {
        return false;
    }

    supportsAltView():boolean {
        return false;
    }

    exposeModelForRetryOnError():null {
        return null;
    }

    getBlockingTiles():Array<number> {
        return [];
    }
}