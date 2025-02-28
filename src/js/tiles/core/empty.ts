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
import { QueryType } from '../../query/index.js';
import { AltViewIconProps, DEFAULT_ALT_VIEW_ICON, ITileProvider, ITileReloader, TileComponent } from '../../page/tile.js';


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

    getSourceInfoComponent():null {
        return null;
    }

    supportsQueryType(qt:QueryType, domain1:string, domain2?:string):boolean {
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

    supportsSVGFigureSave():boolean {
        return false;
    }

    getAltViewIcon():AltViewIconProps {
        return DEFAULT_ALT_VIEW_ICON;
    }

    registerReloadModel(model:ITileReloader):boolean {
        return false;
    }

    getBlockingTiles():Array<number> {
        return [];
    }

    supportsMultiWordQueries():boolean {
        return true;
    }

    getIssueReportingUrl():null {
        return null;
    }
}