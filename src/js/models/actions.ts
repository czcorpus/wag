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

import {Action} from 'kombo';
import { QueryType } from './main';

export enum ActionNames {
    ChangeQueryInput = 'MAIN_CHANGE_QUERY_INPUT',
    ChangeQueryInput2 = 'MAIN_CHANGE_QUERY_INPUT2',
    RequestQueryResponse = 'MAIN_REQUEST_QUERY_RESPONSE',
    ChangeTargetLanguage = 'MAIN_CHANGE_TARGET_LANGUAGE',
    ChangeTargetLanguage2 = 'MAIN_CHANGE_TARGET_LANGUAGE2',
    ChangeQueryType = 'MAIN_CHANGE_QUERY_TYPE',
    AcknowledgeSizes = 'MAIN_ACKNOWLEDGE_SIZES',

}

export namespace Actions {

    export interface RequestQueryResponse extends Action<{
    }> {
        name:ActionNames.ChangeQueryInput;
    }

    export interface ChangeQueryInput extends Action<{
        value:string;
    }> {
        name:ActionNames.ChangeQueryInput;
    }

    export interface ChangeQueryInput2 extends Action<{
        value:string;
    }> {
        name:ActionNames.ChangeQueryInput2;
    }

    export interface ChangeTargetLanguage extends Action<{
        value:string;
    }> {
        name:ActionNames.ChangeTargetLanguage;
    }

    export interface ChangeTargetLanguage2 extends Action<{
        value:string;
    }> {
        name:ActionNames.ChangeTargetLanguage2;
    }

    export interface ChangeQueryType extends Action<{
        value:QueryType;
    }> {
        name:ActionNames.ChangeQueryType;
    }

    export interface AcknowledgeSizes extends Action<{
        values:Array<[number, number]>;
    }> {
        name:ActionNames.AcknowledgeSizes;
    }
}
