/*
 * Copyright 2023 Martin Zimandl <martin.zimandl@gmail.com>
 * Copyright 2023 Institute of the Czech National Corpus,
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

import { SCollsData, SyntacticCollsModelState } from "../../models/tiles/syntacticColls";
import { ResourceApi } from "../../types";
import { SCollsQueryType } from "../vendor/mquery/syntacticColls";

export interface SyntacticCollsApi<T> extends ResourceApi<T, [SCollsQueryType, SCollsData]> {

    /**
     * @param dataSpec is either an ID of an existing concordance or a query
     */
    stateToArgs(state:SyntacticCollsModelState, queryType:SCollsQueryType):T;

}