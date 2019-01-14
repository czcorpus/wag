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

import { TileFactory, ITileProvider } from "../../abstract/types";
import { AppServices } from "../../appServices";


export interface TreqTileConf {
    apiURL:string;
}

/**
 *
 */
export class TreqTile implements ITileProvider {

    private readonly tileId:number;

    private readonly appServices:AppServices;

    constructor({tileId, dispatcher, appServices, ut, mainForm, conf}:TileFactory.Args<TreqTileConf>) {
        this.tileId = tileId;
        this.appServices = appServices;
    }

    init():void {

    }

    getIdent():number {
        return this.tileId;
    }

    getLabel():string {
        return this.appServices.translate('treq__main_label');
    }

    getView():React.ComponentClass|React.SFC<{}> {
        return null; // TODO
    }

    supportsExtendedView():boolean {
        return false;
    }

    supportsSingleWordQuery(language:string):boolean {
        return true;
    }

    supportsTwoWordQuery(language1:string, language2:string):boolean {
        return false;
    }
}


export const init:TileFactory.TileFactory<TreqTileConf> = ({tileId, dispatcher, appServices, ut, mainForm, tilesModel, conf}) => {
    return new TreqTile({tileId, dispatcher, appServices, ut, mainForm, tilesModel, conf});
}