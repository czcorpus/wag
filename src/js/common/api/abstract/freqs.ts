/**
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

import { SourceDetails, ResourceApi } from '../../types';
import { Observable } from 'rxjs';
import { Backlink } from '../../tile';
import { MinMultiCritFreqState, MinSingleCritFreqState } from '../../models/freq';


export interface DataRow {
    name:string;
    freq:number;
    ipm:number;
    norm:number;
    order?:number;
}


export interface APIResponse {
    concId:string;
    corpname:string;
    concsize:number;
    usesubcorp:string|null;
    data:Array<DataRow>;
}


export interface IFreqDistribAPI<T> extends ResourceApi<T, APIResponse> {

    stateToArgs(state:MinSingleCritFreqState, concId:string, subcname?:string):T;

    call(args:T):Observable<APIResponse>;

    getSourceDescription(tileId:number, lang:string, corpname:string):Observable<SourceDetails>;

    createBacklink(state:MinSingleCritFreqState, backlink:Backlink, concId:string);

}


export interface ApiDataBlock {
    data:Array<DataRow>;
}


export interface APIBlockResponse {
    concId:string;
    corpname:string;
    blocks:Array<ApiDataBlock>;
}


export interface IMultiBlockFreqDistribAPI<T> extends ResourceApi<T, APIBlockResponse> {
    stateToArgs(state:MinMultiCritFreqState, concId:string, critIdx?:number, subcname?:string):T;

    call(args:T):Observable<APIBlockResponse>;

    getSourceDescription(tileId:number, lang:string, corpname:string):Observable<SourceDetails>;

    createBacklink(state:MinMultiCritFreqState, backlink:Backlink, concId:string);
}
