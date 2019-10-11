/**
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

import { Observable } from 'rxjs';
import { DataApi, SourceDetails } from '../../types';
import { MatchingDocsModelState } from '../../models/matchingDocs';
import { BacklinkWithArgs } from '../../tile';


export interface DataRow {
    name:string;
    score:number;
}

export interface APIResponse {
    data:Array<DataRow>;
}

export interface MatchingDocsAPI<T> extends DataApi<T, APIResponse> {

    stateToBacklink(state:MatchingDocsModelState, query:string):BacklinkWithArgs<{}>|null;

    stateToArgs(state:MatchingDocsModelState, query:string):T;

    getSourceDescription(tileId:number, uiLang:string, corpname:string):Observable<SourceDetails>;
}