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

import * as Rx from '@reactivex/rxjs';
import { ActionDispatcher, ViewUtils } from 'kombo';
import { GlobalComponents } from '../views/global';
import { WdglanceMainFormModel } from '../models/main';
import { AppServices } from '../appServices';
import { WdglanceTilesModel } from '../models/tiles';


export interface ITileProvider {

    init():void;
    getLabel():string;
    getIdent():number;
    getView():React.ComponentClass|React.SFC<{}>;
    supportsExtendedView():boolean;
    supportsSingleWordQuery(language:string):boolean;
    supportsTwoWordQuery(language1:string, language2:string):boolean;
}


export namespace TileFactory {

    export interface Args<T> {
        tileId:number;
        dispatcher:ActionDispatcher;
        ut:ViewUtils<GlobalComponents>;
        appServices:AppServices;
        mainForm:WdglanceMainFormModel;
        tilesModel:WdglanceTilesModel;
        conf:T;
    }

    export interface TileFactory<T> {
        ({tileId, dispatcher, ut, appServices, mainForm, conf}:Args<T>):ITileProvider;
    }
}


export interface TileFrameProps {
    tileId:number;
    Component:React.ComponentClass<{}>|React.SFC;
    label:string;
    supportsExtendedView:boolean;
}

export interface DataApi<T, U> {
    call(queryArgs:T):Rx.Observable<U>;
}