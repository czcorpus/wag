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

import { SystemMessageType, SourceDetails } from '../types';
import { QueryType } from '../query/index';


export class Actions {

    static RequestQueryResponse:Action<{
        focusedTile?:string;
    }> = {
        name: 'MAIN_REQUEST_QUERY_RESPONSE'
    }

    static RetryTileLoad:Action<{
    }> = {
        name: 'MAIN_RETRY_TILE_LOAD'
    }

    static WakeSuspendedTiles:Action<{
    }> = {
        name: 'MAIN_WAKE_SUSPENDED_TILES'
    }

    static SetEmptyResult:Action<{
        error:[number, string];
    }> = {
        name: 'MAIN_SET_EMPTY_RESULT'
    }

    static TileDataLoaded:Action<{
        tileId:number;
        isEmpty:boolean;
        canBeAmbiguousResult?:boolean;

    }> = {
        name: 'MAIN_TILE_DATA_LOADED'
    }

    static isTileDataLoaded(a:Action):a is typeof Actions.TileDataLoaded {
        return a.name === Actions.TileDataLoaded.name &&
            typeof a.payload['tileId'] === 'number' &&
            typeof a.payload['isEmpty'] === 'boolean' &&
            (
                a.payload['canBeAmbiguousResult'] === undefined ||
                typeof a.payload['canBeAmbiguousResult'] === 'boolean'
            );
    }

    static TilePartialDataLoaded:Action<{
        tileId:number;
    }> = {
        name: 'MAIN_TILE_PARTIAL_DATA_LOADED'
    }

    static ChangeQueryInput:Action<{
        value:string;
        queryIdx:number;
    }> = {
        name:'MAIN_CHANGE_QUERY_INPUT'
    }

    static ChangeCurrQueryMatch:Action<{
        queryIdx:number;
        word:string;
        lemma:string;
        pos:Array<string>;
        upos:Array<string>;

    }> = {
        name:'MAIN_CHANGE_CURR_QUERY_MATCH'
    }

    // this action currently reload the page so we need
    // more arguments than in SPA-mode
    static ChangeTargetDomain:Action<{
        domain1:string;
        domain2:string;
        queryType:QueryType;
        queries:Array<string>;
    }> = {
        name: 'MAIN_CHANGE_TARGET_DOMAIN'
    }

    // this action currently reload the page so we need
    // more arguments than in SPA-mode
    static ChangeQueryType:Action<{
        queryType:QueryType;
        domain1:string;
        domain2:string;
        queries:Array<string>;
    }> = {
        name: 'MAIN_CHANGE_QUERY_TYPE'
    }

    static SetTileRenderSize:Action<{
        size:[number, number];
        isMobile:boolean;
        tileId:number;
    }> = {
        name: 'MAIN_SET_TILE_RENDER_SIZE'
    }

    static SetScreenMode:Action<{
        isMobile:boolean;
        innerWidth:number;
        innerHeight:number;

    }> = {
        name: 'MAIN_SET_SCREEN_MODE'
    }

    static AddSystemMessage:Action<{
        ident:string;
        type:SystemMessageType;
        text:string;
        ttl:number;
    }> = {
        name: 'MAIN_ADD_SYSTEM_MESSAGE'
    }

    static RemoveSystemMessage:Action<{
        ident:string;
    }> = {
        name: 'MAIN_REMOVE_SYSTEM_MESSAGE'
    }

    static SubmitQuery:Action<{}> = {
        name: 'MAIN_SUBMIT_QUERY'
    }

    static EnableAltViewMode:Action<{
        ident:number;
    }> = {
        name: 'MAIN_ENABLE_ALT_VIEW_MODE'
    }

    static DisableAltViewMode:Action<{
        ident:number;
    }> = {
        name: 'MAIN_DISABLE_ALT_VIEW_MODE'
    }

    static EnableTileTweakMode:Action<{
        ident:number;
    }> = {
        name: 'MAIN_ENABLE_TILE_TWEAK_MODE'
    }

    static DisableTileTweakMode:Action<{
        ident:number;
    }> = {
        name: 'MAIN_DISABLE_TILE_TWEAK_MODE'
    }

    static GetSourceInfo:Action<{
        tileId:number;
        corpusId:string;
        subcorpusId?:string;
    }> = {
        name: 'MAIN_GET_SOURCE_INFO'
    }

    static CloseSourceInfo:Action<{
    }> = {
        name: 'MAIN_CLOSE_SOURCE_INFO'
    }

    static GetSourceInfoDone:Action<{
        data:SourceDetails;
    }> = {
        name: 'MAIN_GET_SOURCE_INFO_DONE'
    }

    static ToggleGroupVisibility:Action<{
        groupIdx:number;
    }> = {
        name: 'MAIN_TOGGLE_GROUP_VISIBILITY'
    }

    static OpenGroupAndHighlightTile:Action<{
        groupIdx:number;
        tileId:number;
    }> = {
        name: 'MAIN_OPEN_GROUP_AND_FOCUS_TILE'
    }

    static HighlightTile:Action<{
        tileId:number;
    }> = {
        name: 'MAIN_HIGHLIGHT_TILE'
    }

    static DehighlightTile:Action<{
        tileId:number;
    }> = {
        name: 'MAIN_DEHIGHLIGHT_TILE'
    }

    static ShowGroupHelp:Action<{
        groupIdx:number;
        url:string;
    }> = {
        name: 'MAIN_SHOW_GROUP_HELP'
    }

    static ShowGroupHelpDone:Action<{
        groupIdx:number;
        html:string;
    }> = {
        name: 'MAIN_SHOW_GROUP_HELP_DONE'
    }

    static HideGroupHelp:Action<{
    }> = {
        name: 'MAIN_HIDE_GROUP_HELP'
    }

    static ShowTileHelp:Action<{
        tileId:number;

    }> = {
        name: 'MAIN_SHOW_TILE_HELP'
    }

    static HideTileHelp:Action<{
        tileId:number;

    }> = {
        name: 'MAIN_HIDE_TILE_HELP'
    }

    static LoadTileHelpDone:Action<{
        tileId:number;
        html:string;

    }> = {
        name: 'MAIN_LOAD_TILE_HELP_DONE'
    }

    static SubqItemHighlighted:Action<{
        interactionId:string;
        text:string;

    }> = {
        name: 'MAIN_SUBQ_ITEM_HIGHLIGHTED'
    }

    static SubqItemDehighlighted:Action<{
        interactionId:string;

    }> = {
        name: 'MAIN_SUBQ_ITEM_DEHIGHLIGHTED'
    }

    static SubqChanged:Action<{
        tileId:number;

    }> = {
        name: 'MAIN_SUBQ_CHANGED'
    }

    static TileAreaClicked:Action<{
        tileId:number;
    }> = {
        name: 'MAIN_TILE_AREA_CLICKED'
    }

    static ShowAmbiguousResultHelp:Action<{
    }> = {
        name: 'MAIN_SHOW_AMBIGUOUS_TILE_HELP'
    }

    static HideAmbiguousResultHelp:Action<{
    }> = {
        name: 'MAIN_HIDE_AMBIGUOUS_TILE_HELP'
    }

    static AddCmpQueryInput:Action<{
    }> = {
        name: 'MAIN_ADD_CMP_QUERY_INPUT'
    }

    static RemoveCmpQueryInput:Action<{
        queryIdx:number;
    }> = {
        name: 'MAIN_REMOVE_CMP_QUERY_INPUT'
    }

    static ShowQueryMatchModal:Action<{
    }> = {
        name: 'MAIN_SHOW_QUERY_MATCH_MODAL'
    }

    static HideQueryMatchModal:Action<{
    }> = {
        name: 'MAIN_HIDE_QUERY_MATCH_MODAL'
    }

    static SelectModalQueryMatch:Action<{
        queryIdx:number;
        variantIdx:number;
    }> = {
        name: 'MAIN_SELECT_MODAL_QUERY_MATCH'
    }

    static ApplyModalQueryMatchSelection:Action<{
    }> = {
        name: 'MAIN_APPLY_MODAL_QUERY_MATCH_SELECTION'
    }

    static SetColorTheme:Action<{
        ident:string;
    }> = {
        name: 'MAIN_SET_COLOR_THEME'
    }
}


/**
 * Tests whether the action is either  TileDataLoaded or TilePartialDataLoaded.
 * This can be used when syncing dependent tile.
 */
 export function isTileSomeDataLoadedAction(action:Action):boolean {
    return action.name === Actions.TileDataLoaded.name ||
            action.name === Actions.TilePartialDataLoaded.name;
}