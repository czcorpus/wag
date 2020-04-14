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

// This module contains types for APIs willing to implement 'timeDistrib'
// tile-compatible resource access.

import { DataApi } from '../../types';
import { BacklinkWithArgs, Backlink } from '../../tile';


export interface TimeDistribArgs {

 	corpName:string;

    subcorpName?:string;

    /**
     * This can be either a CQL-ish query or a concordance persistence ID
     */
    concIdent:string;
}

/**
 *
 */
export interface TimeDistribItem {

    datetime:string;

    /**
     * Absolute frequency
     */
    freq:number;

    /**
     * Size of a respective (sub)corpus in tokens
     */
    norm:number;
}

/**
 *
 */
export interface TimeDistribResponse {
    corpName:string;
    subcorpName?:string;
    concPersistenceID?:string;
    data:Array<TimeDistribItem>;
}

/**
 * A general bare-bones interface for TimeDistrib function.
 */
export interface TimeDistribApi extends DataApi<TimeDistribArgs, TimeDistribResponse> {
    createBackLink(backlink:Backlink, corpname:string, concId:string, origQuery?:string):BacklinkWithArgs<{}>
}