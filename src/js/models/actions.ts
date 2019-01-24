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
import { SystemMessageType } from '../abstract/types';

export enum ActionName {
    ChangeQueryInput = 'MAIN_CHANGE_QUERY_INPUT',
    ChangeQueryInput2 = 'MAIN_CHANGE_QUERY_INPUT2',
    RequestQueryResponse = 'MAIN_REQUEST_QUERY_RESPONSE',
    ChangeTargetLanguage = 'MAIN_CHANGE_TARGET_LANGUAGE',
    ChangeTargetLanguage2 = 'MAIN_CHANGE_TARGET_LANGUAGE2',
    ChangeQueryType = 'MAIN_CHANGE_QUERY_TYPE',
    AcknowledgeSizes = 'MAIN_ACKNOWLEDGE_SIZES',
    AddSystemMessage = 'MAIN_ADD_SYSTEM_MESSAGE',
    RemoveSystemMessage = 'MAIN_REMOVE_SYSTEM_MESSAGE',
    SubmitQuery = 'MAIN_SUBMIT_QUERY',
    ExpandTile = 'MAIN_EXPAND_TILE',
    ResetExpandTile = 'MAIN_RESET_EXPAND_TILE',
}

export enum QueryType {
    SINGLE_QUERY = 'single',
    CMP_QUERY = 'double',
    TRANSLAT_QUERY = 'translat'
}

export namespace Actions {

    export interface RequestQueryResponse extends Action<{
    }> {
        name:ActionName.ChangeQueryInput;
    }

    export interface ChangeQueryInput extends Action<{
        value:string;
    }> {
        name:ActionName.ChangeQueryInput;
    }

    export interface ChangeQueryInput2 extends Action<{
        value:string;
    }> {
        name:ActionName.ChangeQueryInput2;
    }

    export interface ChangeTargetLanguage extends Action<{
        value:string;
    }> {
        name:ActionName.ChangeTargetLanguage;
    }

    export interface ChangeTargetLanguage2 extends Action<{
        value:string;
    }> {
        name:ActionName.ChangeTargetLanguage2;
    }

    export interface ChangeQueryType extends Action<{
        value:QueryType;
    }> {
        name:ActionName.ChangeQueryType;
    }

    export interface AcknowledgeSizes extends Action<{
        values:Array<[number, number]>;
    }> {
        name:ActionName.AcknowledgeSizes;
    }

    export interface AddSystemMessage extends Action<{
        ident:string;
        type:SystemMessageType;
        text:string;
        ttl:number;
    }> {
        name:ActionName.AddSystemMessage;
    }

    export interface RemoveSystemMessage extends Action<{
        ident:string;
    }> {
        name:ActionName.RemoveSystemMessage;
    }

    export interface SubmitQuery extends Action<{}> {
        name:ActionName.SubmitQuery;
    }

    export interface ExpandTile extends Action<{
        ident:number;
    }> {
        name:ActionName.ExpandTile;
    }

    export interface ResetExpandTile extends Action<{
        ident:number;
    }> {
        name:ActionName.ResetExpandTile;
    }
}
