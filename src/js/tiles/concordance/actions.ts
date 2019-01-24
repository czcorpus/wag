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

import { Action } from "kombo";
import { ConcResponse } from "./api";


export enum ActionName {
    DataLoadDone = 'CONCORDANCE_LOAD_DATA_DONE',
    LoadNextPage = 'CONCORDANCE_LOAD_NEXT_PAGE',
    LoadNextPageDone = 'CONCORDANCE_LOAD_NEXT_PAGE_DONE',
    LoadPrevPage = 'CONCORDANCE_LOAD_PREV_PAGE',
    LoadPrevPageDone = 'CONCORDANCE_LOAD_PREV_PAGE_DONE'
}


export namespace Actions {

    export interface DataLoadDone extends Action<{
        data:ConcResponse;
    }> {
        name:ActionName.DataLoadDone;
    }

    export interface LoadNextPage extends Action<{
    }> {
        name:ActionName.LoadNextPage;
    }

    export interface LoadPrevPage extends Action<{
    }> {
        name:ActionName.LoadPrevPage;
    }
}