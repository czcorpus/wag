/*
 * Copyright 2021 Martin Zimandl <martin.zimandl@gmail.com>
 * Copyright 2021 Institute of the Czech National Corpus,
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

import { QueryType } from '../../query';

export interface ActionLogRecord {
    action:string;
    userId:number|null;  // provide userId if available
    datetime:string;
    queryType:QueryType;
    request:{
        origin:string;
        userAgent:string;
        referer:string;
    };
    lang1:string;
    lang2:string;
    hasPosSpecification:boolean;
    isQuery:boolean;
    isMobileClient:boolean;
    hasMatch:boolean;
}

export interface IActionWriter {
    write(log:ActionLogRecord):void;
}
