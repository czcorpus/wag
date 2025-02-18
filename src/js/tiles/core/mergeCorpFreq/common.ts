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

import { Backlink } from '../../../page/tile.js';
import { MinSingleCritFreqState } from '../../../models/tiles/freq.js';

export interface ModelSourceArgs extends MinSingleCritFreqState {

    subcname:string|null;

    corpusSize:number;

    /**
     * In case 'fcrit' describes a positional
     * attribute we have to replace an actual
     * value returned by freq. distrib. function
     * (which is equal to our query: e.g. for
     * the query 'house' the value will be 'house')
     * by something more specific (e.g. 'social media')
     */
    valuePlaceholder:string|null;

    backlinkTpl:Backlink;

    uuid:string;

    isSingleCategory:boolean;

    uniqueColor:boolean;
}

