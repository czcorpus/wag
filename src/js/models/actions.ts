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
import { SystemMessageType, QueryType } from '../abstract/types';
import {APIResponse} from '../shared/api/corpusInfo';

export enum ActionName {
    ChangeQueryInput = 'MAIN_CHANGE_QUERY_INPUT',
    ChangeQueryInput2 = 'MAIN_CHANGE_QUERY_INPUT2',
    EnableAnswerMode = 'MAIN_ENABLE_ANSWER_MODE',
    DisableAnswerMode = 'MAIN_DISABLE_ANSWER_MODE',
    RequestQueryResponse = 'MAIN_REQUEST_QUERY_RESPONSE',
    ChangeTargetLanguage = 'MAIN_CHANGE_TARGET_LANGUAGE',
    ChangeQueryType = 'MAIN_CHANGE_QUERY_TYPE',
    SetTileRenderSize = 'MAIN_SET_TILE_RENDER_SIZE',
    SetScreenMode = 'MAIN_SET_SCREEN_MODE',
    AddSystemMessage = 'MAIN_ADD_SYSTEM_MESSAGE',
    RemoveSystemMessage = 'MAIN_REMOVE_SYSTEM_MESSAGE',
    SubmitQuery = 'MAIN_SUBMIT_QUERY',
    EnableTileTweakMode = 'MAIN_ENABLE_TILE_TWEAK_MODE',
    DisableTileTweakMode = 'MAIN_DISABLE_TILE_TWEAK_MODE',
    GetCorpusInfo = 'MAIN_GET_CORPUS_INFO',
    GetCorpusInfoDone = 'MAIN_GET_CORPUS_INFO_DONE',
    CloseCorpusInfo = 'MAIN_CLOSE_CORPUS_INFO',
    ToggleGroupVisibility = 'MAIN_TOGGLE_GROUP_VISIBILITY',
    ShowTileHelp = 'MAIN_SHOW_TILE_HELP',
    LoadTileHelpDone = 'MAIN_LOAD_TILE_HELP_DONE',
    HideTileHelp = 'MAIN_HIDE_TILE_HELP',
}

export namespace Actions {

    export interface RequestQueryResponse extends Action<{
    }> {
        name:ActionName.ChangeQueryInput;
    }

    export interface EnableAnswerMode extends Action<{

    }> {
        name:ActionName.EnableAnswerMode;
    }

    export interface DisableAnswerMode extends Action<{

    }> {
        name:ActionName.DisableAnswerMode;
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

    // this action currently reload the page so we need
    // more arguments than in SPA-mode
    export interface ChangeTargetLanguage extends Action<{
        lang1:string;
        lang2:string;
        queryType:QueryType;
        q1:string;
        q2:string;
    }> {
        name:ActionName.ChangeTargetLanguage;
    }

    // this action currently reload the page so we need
    // more arguments than in SPA-mode
    export interface ChangeQueryType extends Action<{
        queryType:QueryType;
        lang1:string;
        lang2:string;
        q1:string;
        q2:string;
    }> {
        name:ActionName.ChangeQueryType;
    }

    export interface SetTileRenderSize extends Action<{
        size:[number, number];
        isMobile:boolean;
        tileId:number;
    }> {
        name:ActionName.SetTileRenderSize;
    }

    export interface SetScreenMode extends Action<{
        isMobile:boolean;

    }> {
        name: ActionName.SetScreenMode;
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

    export interface EnableTileTweakMode extends Action<{
        ident:number;
    }> {
        name:ActionName.EnableTileTweakMode;
    }

    export interface DisableTileTweakMode extends Action<{
        ident:number;
    }> {
        name:ActionName.DisableTileTweakMode;
    }

    export interface GetCorpusInfo extends Action<{
        corpusId:string;
        subcorpusId?:string;
    }> {
        name:ActionName.GetCorpusInfo;
    }

    export interface CloseCorpusInfo extends Action<{
    }> {
        name:ActionName.CloseCorpusInfo;
    }

    export interface GetCorpusInfoDone extends Action<{
        data:APIResponse;
    }> {
        name:ActionName.GetCorpusInfoDone;
    }

    export interface ToggleGroupVisibility extends Action<{
        groupIdx:number;
    }> {
        name:ActionName.ToggleGroupVisibility;
    }

    export interface ShowTileHelp extends Action<{
        tileId:number;

    }> {
        name:ActionName.ShowTileHelp;
    }

    export interface HideTileHelp extends Action<{
        tileId:number;

    }> {
        name:ActionName.HideTileHelp;
    }

    export interface LoadTileHelpDone extends Action<{
        tileId:number;
        html:string;

    }> {
        name:ActionName.LoadTileHelpDone;
    }
}
