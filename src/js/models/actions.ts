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
import { Action } from 'kombo';

import { SystemMessageType, SourceDetails } from '../common/types';
import { QueryType, QueryPoS } from '../common/query';


export enum ActionName {
    ChangeQueryInput = 'MAIN_CHANGE_QUERY_INPUT',
    ChangeCurrQueryMatch = 'MAIN_CHANGE_CURR_QUERY_MATCH',
    RequestQueryResponse = 'MAIN_REQUEST_QUERY_RESPONSE',
    RetryTileLoad = 'MAIN_RETRY_TILE_LOAD',
    WakeSuspendedTiles = 'MAIN_WAKE_SUSPENDED_TILES',
    SetEmptyResult = 'MAIN_SET_EMPTY_RESULT',
    TileDataLoaded = 'MAIN_TILE_DATA_LOADED',
    TilePartialDataLoaded = 'MAIN_TILE_PARTIAL_DATA_LOADED',
    ChangeTargetLanguage = 'MAIN_CHANGE_TARGET_LANGUAGE',
    ChangeQueryType = 'MAIN_CHANGE_QUERY_TYPE',
    SetTileRenderSize = 'MAIN_SET_TILE_RENDER_SIZE',
    SetScreenMode = 'MAIN_SET_SCREEN_MODE',
    AddSystemMessage = 'MAIN_ADD_SYSTEM_MESSAGE',
    RemoveSystemMessage = 'MAIN_REMOVE_SYSTEM_MESSAGE',
    SubmitQuery = 'MAIN_SUBMIT_QUERY',
    EnableAltViewMode = 'MAIN_ENABLE_ALT_VIEW_MODE',
    DisableAltViewMode = 'MAIN_DISABLE_ALT_VIEW_MODE',
    EnableTileTweakMode = 'MAIN_ENABLE_TILE_TWEAK_MODE',
    DisableTileTweakMode = 'MAIN_DISABLE_TILE_TWEAK_MODE',
    GetSourceInfo = 'MAIN_GET_SOURCE_INFO',
    GetSourceInfoDone = 'MAIN_GET_SOURCE_INFO_DONE',
    CloseSourceInfo = 'MAIN_CLOSE_SOURCE_INFO',
    ToggleGroupVisibility = 'MAIN_TOGGLE_GROUP_VISIBILITY',
    OpenGroupAndHighlightTile = 'MAIN_OPEN_GROUP_AND_FOCUS_TILE',
    HighlightTile = 'MAIN_FOCUS_TILE',
    DehighlightTile = 'MAIN_UNFOCUS_TILE',
    ShowGroupHelp = 'MAIN_SHOW_GROUP_HELP',
    ShowGroupHelpDone = 'MAIN_SHOW_GROUP_HELP_DONE',
    HideGroupHelp = 'MAIN_HIDE_GROUP_HELP',
    ShowTileHelp = 'MAIN_SHOW_TILE_HELP',
    LoadTileHelpDone = 'MAIN_LOAD_TILE_HELP_DONE',
    HideTileHelp = 'MAIN_HIDE_TILE_HELP',
    SubqItemHighlighted = 'MAIN_SUBQ_ITEM_HIGHLIGHTED',
    SubqItemDehighlighted = 'MAIN_SUBQ_ITEM_DEHIGHLIGHTED',
    SubqChanged = 'MAIN_SUBQ_CHANGED',
    TileAreaClicked = 'MAIN_TILE_AREA_CLICKED',
    ShowAmbiguousResultHelp = 'MAIN_SHOW_AMBIGUOUS_TILE_HELP',
    HideAmbiguousResultHelp = 'MAIN_HIDE_AMBIGUOUS_TILE_HELP',
    AddCmpQueryInput = 'MAIN_ADD_CMP_QUERY_INPUT',
    RemoveCmpQueryInput = 'MAIN_REMOVE_CMP_QUERY_INPUT',
    ShowQueryMatchModal = 'MAIN_SHOW_QUERY_MATCH_MODAL',
    HideQueryMatchModal = 'MAIN_HIDE_QUERY_MATCH_MODAL',
    SelectModalQueryMatch = 'MAIN_SELECT_MODAL_QUERY_MATCH',
    ApplyModalQueryMatchSelection = 'MAIN_APPLY_MODAL_QUERY_MATCH_SELECTION',
    SetColorTheme = 'MAIN_SET_COLOR_THEME'
}

/**
 * Tests whether the action is either  TileDataLoaded or TilePartialDataLoaded.
 * This can be used when syncing dependent tile.
 */
export function isTileSomeDataLoadedAction(action:Action):boolean {
    return action.name === ActionName.TileDataLoaded || action.name === ActionName.TilePartialDataLoaded;
}

export namespace Actions {

    export interface RequestQueryResponse extends Action<{
    }> {
        name:ActionName.RequestQueryResponse;
    }

    export interface RetryTileLoad extends Action<{
    }> {
        name:ActionName.RetryTileLoad;
    }

    export interface WakeSuspendedTiles extends Action<{
    }> {
        name:ActionName.WakeSuspendedTiles;
    }

    export interface SetEmptyResult extends Action<{
        error?:string;AddCmpQueryField

    }> {
        name:ActionName.SetEmptyResult;
    }

    export interface TileDataLoaded<T> extends Action<{
        tileId:number;
        isEmpty:boolean;
        canBeAmbiguousResult?:boolean;

    } & T> {
        name: ActionName.TileDataLoaded;
    }

    export interface TilePartialDataLoaded<T> extends Action<{
        tileId:number;

    } & T> {
        name: ActionName.TilePartialDataLoaded;
    }

    export interface ChangeQueryInput extends Action<{
        value:string;
        queryIdx:number;
    }> {
        name:ActionName.ChangeQueryInput;
    }

    export interface ChangeCurrQueryMatch extends Action<{
        queryIdx:number;
        word:string;
        lemma:string;
        pos:Array<Array<QueryPoS>>;

    }> {
        name:ActionName.ChangeCurrQueryMatch;
    }

    // this action currently reload the page so we need
    // more arguments than in SPA-mode
    export interface ChangeTargetLanguage extends Action<{
        lang1:string;
        lang2:string;
        queryType:QueryType;
        queries:Array<string>;
    }> {
        name:ActionName.ChangeTargetLanguage;
    }

    // this action currently reload the page so we need
    // more arguments than in SPA-mode
    export interface ChangeQueryType extends Action<{
        queryType:QueryType;
        lang1:string;
        lang2:string;
        queries:Array<string>;
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
        innerWidth:number;
        innerHeight:number;

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

    export interface EnableAltViewMode extends Action<{
        ident:number;
    }> {
        name:ActionName.EnableAltViewMode;
    }

    export interface DisableAltViewMode extends Action<{
        ident:number;
    }> {
        name:ActionName.DisableAltViewMode;
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

    export interface GetSourceInfo extends Action<{
        tileId:number;
        corpusId:string;
        subcorpusId?:string;
    }> {
        name:ActionName.GetSourceInfo;
    }

    export interface CloseSourceInfo extends Action<{
    }> {
        name:ActionName.CloseSourceInfo;
    }

    export interface GetSourceInfoDone extends Action<{
        data:SourceDetails;
    }> {
        name:ActionName.GetSourceInfoDone;
    }

    export interface ToggleGroupVisibility extends Action<{
        groupIdx:number;
    }> {
        name:ActionName.ToggleGroupVisibility;
    }

    export interface OpenGroupAndHighlightTile extends Action<{
        groupIdx:number;
        tileId:number;
    }> {
        name:ActionName.OpenGroupAndHighlightTile;
    }

    export interface HighlightTile extends Action<{
        tileId:number;
    }> {
        name:ActionName.HighlightTile;
    }

    export interface DehighlightTile extends Action<{
        tileId:number;
    }> {
        name:ActionName.DehighlightTile;
    }

    export interface ShowGroupHelp extends Action<{
        groupIdx:number;
        url:string;
    }> {
        name:ActionName.ShowGroupHelp;
    }

    export interface ShowGroupHelpDone extends Action<{
        groupIdx:number;
        html:string;
    }> {
        name:ActionName.ShowGroupHelpDone;
    }

    export interface HideGroupHelp extends Action<{
    }> {
        name:ActionName.HideGroupHelp;
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

    export interface SubqItemHighlighted extends Action<{
        interactionId:string;
        text:string;

    }> {
        name:ActionName.SubqItemHighlighted;
    }

    export interface SubqItemDehighlighted extends Action<{
        interactionId:string;

    }> {
        name:ActionName.SubqItemDehighlighted;
    }

    export interface SubqChanged extends Action<{
        tileId:number;

    }> {
        name:ActionName.SubqChanged;
    }

    export interface TileAreaClicked extends Action<{
        tileId:number;
    }> {
        name:ActionName.TileAreaClicked;
    }

    export interface ShowAmbiguousResultHelp extends Action<{
    }> {
        name:ActionName.ShowAmbiguousResultHelp;
    }

    export interface HideAmbiguousResultHelp extends Action<{
    }> {
        name:ActionName.HideAmbiguousResultHelp;
    }

    export interface AddCmpQueryInput extends Action<{
    }> {
        name:ActionName.AddCmpQueryInput;
    }

    export interface RemoveCmpQueryInput extends Action<{
        queryIdx:number;
    }> {
        name:ActionName.RemoveCmpQueryInput;
    }

    export interface ShowQueryMatchModal extends Action<{
    }> {
        name:ActionName.ShowQueryMatchModal;
    }

    export interface HideQueryMatchModal extends Action<{
    }> {
        name:ActionName.HideQueryMatchModal;
    }

    export interface SelectModalQueryMatch extends Action<{
        queryIdx:number;
        variantIdx:number;
    }> {
        name:ActionName.SelectModalQueryMatch;
    }

    export interface ApplyModalQueryMatchSelection extends Action<{
    }> {
        name:ActionName.ApplyModalQueryMatchSelection;
    }

    export interface SetColorTheme extends Action<{
        ident:string;
    }> {
        name:ActionName.SetColorTheme;
    }
}
