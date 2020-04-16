/*
 * Copyright 2020 Martin Zimandl <martin.zimandl@gmail.com>
 * Copyright 2020 Institute of the Czech National Corpus,
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

import { TestModelWrapper } from '../framework';

import { restore, stub } from 'sinon';
import { assert } from 'chai';

import { WdglanceTilesModel, WdglanceTilesState, TileResultFlag } from '../../src/js/models/tiles';
import { ActionName } from '../../src/js/models/actions';
import * as ajax from '../../src/js/common/ajax';
import { of, throwError } from 'rxjs';
import { SystemMessageType } from '../../src/js/common/types';


describe('WdglanceTilesModel', function () {
    function setupModel(initialStateOverrides = {}):TestModelWrapper<WdglanceTilesModel, WdglanceTilesState> {
        return new TestModelWrapper(
            (dispatcher, appServices) => new WdglanceTilesModel(
                dispatcher,
                {...initialStateOverrides} as WdglanceTilesState,
                appServices
            )
        );
    }

    this.afterEach(function () {
        restore();
    });

    it('sets screen mode', function (done) {
        setupModel()
        .checkState(
            {name: ActionName.SetScreenMode, payload: {isMobile: true}},
            ActionName.SetScreenMode,
            state => {
                assert.isTrue(state.isMobile);
                done();
            }
        );
    });

    it('sets tile render size', function (done) {
        setupModel({tileProps: [{tileId: 1}]})
        .checkState(
            {name: ActionName.SetTileRenderSize, payload: {tileId: 1, size: [10, 20]}},
            ActionName.SetTileRenderSize,
            state => {
                assert.deepEqual(state.tileProps[0].renderSize, [11, 20]);
                done();
            }
        );
    });

    describe('alt view', function () {
        it('enables alt view mode', function (done) {
            setupModel({altViewActiveTiles: []})
            .checkState(
                {name: ActionName.EnableAltViewMode, payload: {ident: 1}},
                ActionName.EnableAltViewMode,
                state => {
                    assert.include(state.altViewActiveTiles, 1);
                    done();
                }
            );
        });

        it('enables alt view mode again', function (done) {
            setupModel({altViewActiveTiles: [1]})
            .checkState(
                {name: ActionName.EnableAltViewMode, payload: {ident: 1}},
                ActionName.EnableAltViewMode,
                state => {
                    assert.deepEqual(state.altViewActiveTiles, [1]);
                    done();
                }
            );
        });

        it('disables alt view mode', function (done) {
            setupModel({altViewActiveTiles: [1, 2, 3]})
            .checkState(
                {name: ActionName.DisableAltViewMode, payload: {ident: 2}},
                ActionName.DisableAltViewMode,
                state => {
                    assert.notInclude(state.altViewActiveTiles, 2);
                    done();
                }
            );
        });
    });

    describe('tweak mode', function () {
        it('enables tweak mode', function (done) {
            setupModel({tweakActiveTiles: []})
            .checkState(
                {name: ActionName.EnableTileTweakMode, payload: {ident: 1}},
                ActionName.EnableTileTweakMode,
                state => {
                    assert.include(state.tweakActiveTiles, 1);
                    done();
                }
            );
        });

        it('enables tweak mode again', function (done) {
            setupModel({tweakActiveTiles: [1]})
            .checkState(
                {name: ActionName.EnableTileTweakMode, payload: {ident: 1}},
                ActionName.EnableTileTweakMode,
                state => {
                    assert.deepEqual(state.tweakActiveTiles, [1]);
                    done();
                }
            );
        });

        it('disables tweak mode', function (done) {
            setupModel({tweakActiveTiles: [1, 2, 3]})
            .checkState(
                {name: ActionName.DisableTileTweakMode, payload: {ident: 2}},
                ActionName.DisableTileTweakMode,
                state => {
                    assert.notInclude(state.tweakActiveTiles, 2);
                    done();
                }
            );
        });
    });

    describe('tile help', function () {
        it('shows tile help', function (done) {
            setupModel()
            .checkState(
                {name: ActionName.ShowTileHelp, payload: {tileId: 1}},
                ActionName.ShowTileHelp,
                state => {
                    assert.deepEqual(state.activeTileHelp, {ident:1, html: null});
                    assert.isTrue(state.isBusy);
                    done();
                }
            );
        });

        it('tests tile help side effect undefined url', function (done) {
            setupModel({tileProps: [undefined]})
            .checkState(
                {name: ActionName.ShowTileHelp, payload: {tileId: 0}},
                ActionName.LoadTileHelpDone,
                state => {
                    assert.equal(state.activeTileHelp, null);
                    assert.isFalse(state.isBusy);
                    done();
                }
            );
        });

        it('tests tile help side effect correct url', function (done) {
            stub(ajax, 'ajax$').returns(of('<div/>'));

            setupModel({tileProps: [{helpURL: 'somewhere'}]})
            .checkState(
                {name: ActionName.ShowTileHelp, payload: {tileId: 0}},
                ActionName.LoadTileHelpDone,
                state => {
                    assert.deepEqual(state.activeTileHelp, {html: '<div/>', ident: 0});
                    assert.isFalse(state.isBusy);
                    done();
                }
            );
        });

        it('tests tile help side effect ajax error', function (done) {
            stub(ajax, 'ajax$').returns(throwError(Error));

            setupModel({tileProps: [{helpURL: 'somewhere'}]})
            .checkState(
                {name: ActionName.ShowTileHelp, payload: {tileId: 0}},
                ActionName.LoadTileHelpDone,
                state => {
                    assert.equal(state.activeTileHelp, null);
                    assert.isFalse(state.isBusy);
                    done();
                }
            );
        });

        it('finishes tile help load successfuly', function (done) {
            setupModel({isBusy: true, activeTileHelp: {ident: 1, html: null}})
            .checkState(
                {name: ActionName.LoadTileHelpDone, payload: {tileId: 1, html: '<div/>'}},
                ActionName.LoadTileHelpDone,
                state => {
                    assert.deepEqual(state.activeTileHelp, {ident: 1, html: '<div/>'});
                    assert.isFalse(state.isBusy);
                    done();
                }
            );
        });

        it('finishes tile help load with error', function (done) {
            setupModel({isBusy: true, activeTileHelp: {ident: 1, html: null}})
            .checkState(
                {name: ActionName.LoadTileHelpDone, error: Error()},
                ActionName.LoadTileHelpDone,
                state => {
                    assert.equal(state.activeTileHelp, null);
                    assert.isFalse(state.isBusy);
                    done();
                }
            );
        });

        it('hides tile help', function (done) {
            setupModel({activeTileHelp: {html: '<div/>', ident: 1}})
            .checkState(
                {name: ActionName.HideTileHelp},
                ActionName.HideTileHelp,
                state => {
                    assert.equal(state.activeTileHelp, null);
                    done();
                }
            );
        });
    });

    describe('source info', function () {
        it('gets source info', function (done) {
            setupModel()
            .checkState(
                {name: ActionName.GetSourceInfo, payload: {tileId: 1}},
                ActionName.GetSourceInfo,
                state => {
                    assert.deepEqual(state.activeSourceInfo, {tileId: 1, title: null, description: null, author: null});
                    assert.isTrue(state.isBusy);
                    done();
                }
            );
        });

        it('finishes getting source info with error', function (done) {
            setupModel({activeSourceInfo: {tileId: 1, title: null, description: null, author: null}})
            .checkState(
                {name: ActionName.GetSourceInfoDone, error: Error()},
                ActionName.GetSourceInfoDone,
                state => {
                    assert.equal(state.activeSourceInfo, null);
                    assert.isFalse(state.isBusy);
                    done();
                }
            );
        });

        it('finishes getting source info succesfully', function (done) {
            setupModel()
            .checkState(
                {name: ActionName.GetSourceInfoDone, payload: {data: {tileId: 1, title: 'title', description: 'desc', author: 'auth'}}},
                ActionName.GetSourceInfoDone,
                state => {
                    assert.deepEqual(state.activeSourceInfo, {tileId: 1, title: 'title', description: 'desc', author: 'auth'});
                    assert.isFalse(state.isBusy);
                    done();
                }
            );
        });

        it('closes source info', function (done) {
            setupModel({activeSourceInfo: {tileId: 1, title: 'title', description: 'desc', author: 'auth'}})
            .checkState(
                {name: ActionName.CloseSourceInfo},
                ActionName.CloseSourceInfo,
                state => {
                    assert.equal(state.activeSourceInfo, null);
                    done();
                }
            );
        });
    });

    describe('group visibility', function () {
        it('toggles group visibility off', function (done) {
            setupModel({hiddenGroups: [1, 3]})
            .checkState(
                {name: ActionName.ToggleGroupVisibility, payload: {groupIdx: 2}},
                ActionName.ToggleGroupVisibility,
                state => {
                    assert.include(state.hiddenGroups, 2);
                    done();
                }
            );
        });

        it('toggles group visibility on', function (done) {
            setupModel({hiddenGroups: [1, 2, 3]})
            .checkState(
                {name: ActionName.ToggleGroupVisibility, payload: {groupIdx: 2}},
                ActionName.ToggleGroupVisibility,
                state => {
                    assert.notInclude(state.hiddenGroups, 2);
                    done();
                }
            );
        });

        it('opens group and highlights tile side effect', function (done) {
            let highlightCount = 0;
            setupModel({hiddenGroups: [1, 2, 3]})
            .checkState(
                {name: ActionName.OpenGroupAndHighlightTile, payload: {groupIdx: 1, tileId: 1}},
                ActionName.HighlightTile,
                state => {
                    highlightCount += 1;
                    if (highlightCount >= 9) {
                        assert.deepEqual(state.hiddenGroups, [2, 3]);
                        assert.equal(state.highlightedTileId, 1);
                        assert.equal(highlightCount, 9);
                        done();
                    }
                }
            );
        });
    });

    describe('tile highlight', function () {
        it('highlights tile', function (done) {
            setupModel()
            .checkState(
                {name: ActionName.HighlightTile, payload: {tileId: 1}},
                ActionName.HighlightTile,
                state => {
                    assert.equal(state.highlightedTileId, 1);
                    done();
                }
            );
        });

        it('dehighlights tile', function (done) {
            setupModel()
            .checkState(
                {name: ActionName.DehighlightTile},
                ActionName.DehighlightTile,
                state => {
                    assert.equal(state.highlightedTileId, -1);
                    done();
                }
            );
        });
    });

    describe('group help', function () {
        it('starts showing group help', function (done) {
            setupModel()
            .checkState(
                {name: ActionName.ShowGroupHelp, payload: {groupIdx: 1, url: 'somewhere'}},
                ActionName.ShowGroupHelp,
                state => {
                    assert.isTrue(state.isBusy);
                    assert.deepEqual(state.activeGroupHelp, {html: '', idx: 1});
                    done();
                }
            );
        });

        it('tests showing group help side effect error', function (done) {
            stub(ajax, 'ajax$').returns(throwError(Error));

            setupModel()
            .checkState(
                {name: ActionName.ShowGroupHelp, payload: {groupIdx: 1, url: 'somewhere'}},
                ActionName.ShowGroupHelpDone,
                (state, appServices) => {
                    assert.equal(state.activeGroupHelp, null);
                    assert.isFalse(state.isBusy);
                    assert.isTrue(appServices.showMessage.calledWith(SystemMessageType.ERROR));
                    done();
                }
            );
        });

        it('tests showing group help side effect successfull', function (done) {
            stub(ajax, 'ajax$').returns(of('<div/>'));

            setupModel()
            .checkState(
                {name: ActionName.ShowGroupHelp, payload: {groupIdx: 1, url: 'somewhere'}},
                ActionName.ShowGroupHelpDone,
                state => {
                    assert.deepEqual(state.activeGroupHelp, {html: '<div/>', idx: 1});
                    assert.isFalse(state.isBusy);
                    done();
                }
            );
        });

        it('finishes showing group help succesfully', function (done) {
            setupModel({activeGroupHelp: null, isBusy: true})
            .checkState(
                {name: ActionName.ShowGroupHelpDone, payload: {html: '<div/>', groupIdx: 1}},
                ActionName.ShowGroupHelpDone,
                state => {
                    assert.deepEqual(state.activeGroupHelp, {html: '<div/>', idx: 1});
                    assert.isFalse(state.isBusy);
                    done();
                }
            );
        });

        it('finishes showing group help with error', function (done) {
            setupModel({activeGroupHelp: null, isBusy: true})
            .checkState(
                {name: ActionName.ShowGroupHelpDone, error: Error()},
                ActionName.ShowGroupHelpDone,
                state => {
                    assert.equal(state.activeGroupHelp, null);
                    assert.isFalse(state.isBusy);
                    done();
                }
            );
        });

        it('hides group help', function (done) {
            setupModel({activeGroupHelp: {html: '<div/>', idx: 1}})
            .checkState(
                {name: ActionName.HideGroupHelp},
                ActionName.HideGroupHelp,
                state => {
                    assert.equal(state.activeGroupHelp, null);
                    done();
                }
            );
        });
    });

    it('requests query response', function (done) {
        setupModel({
            tileResultFlags: [
                {tileId: 1, groupId: 1, status: TileResultFlag.EMPTY_RESULT, canBeAmbiguousResult: false},
                {tileId: 2, groupId: 1, status: TileResultFlag.EMPTY_RESULT, canBeAmbiguousResult: true},
                {tileId: 3, groupId: 2, status: TileResultFlag.EMPTY_RESULT, canBeAmbiguousResult: false}
            ]
        })
        .checkState(
            {name: ActionName.RequestQueryResponse},
            ActionName.RequestQueryResponse,
            state => {
                assert.isTrue(state.tileResultFlags.every(v => v.canBeAmbiguousResult === false));
                assert.isTrue(state.tileResultFlags.every(v => v.status === TileResultFlag.PENDING));
                assert.deepEqual(state.datalessGroups, []);
                done();
            }
        );
    });

    describe('loading tile data', function() {
        it('loads valid tile data', function (done) { 
            setupModel({
                numTilesError: 0,
                datalessGroups: [],
                tileResultFlags: [
                    {tileId: 1, groupId: 1, status: TileResultFlag.EMPTY_RESULT, canBeAmbiguousResult: false},
                    {tileId: 2, groupId: 1, status: TileResultFlag.PENDING, canBeAmbiguousResult: false},
                    {tileId: 3, groupId: 2, status: TileResultFlag.PENDING, canBeAmbiguousResult: false}
                ]
            })
            .checkState(
                {name: ActionName.TileDataLoaded, payload: {tileId: 2, isEmpty: false, canBeAmbiguousResult: true}},
                ActionName.TileDataLoaded,
                state => {
                    assert.deepEqual(state.tileResultFlags[1], {tileId: 2, groupId: 1, status: TileResultFlag.VALID_RESULT, canBeAmbiguousResult: true});
                    assert.deepEqual(state.datalessGroups, []);
                    assert.equal(state.numTileErrors, 0);
                    done();
                }
            );
        });

        it('loads empty tile data', function (done) { 
            setupModel({
                numTilesError: 0,
                datalessGroups: [],
                tileResultFlags: [
                    {tileId: 1, groupId: 1, status: TileResultFlag.EMPTY_RESULT, canBeAmbiguousResult: false},
                    {tileId: 2, groupId: 1, status: TileResultFlag.PENDING, canBeAmbiguousResult: false},
                    {tileId: 3, groupId: 2, status: TileResultFlag.PENDING, canBeAmbiguousResult: false}
                ]
            })
            .checkState(
                {name: ActionName.TileDataLoaded, payload: {tileId: 2, isEmpty: true, canBeAmbiguousResult: true}},
                ActionName.TileDataLoaded,
                state => {
                    assert.deepEqual(state.tileResultFlags[1], {tileId: 2, groupId: 1, status: TileResultFlag.EMPTY_RESULT, canBeAmbiguousResult: true});
                    assert.deepEqual(state.datalessGroups, []);
                    assert.equal(state.numTileErrors, 0);
                    done();
                }
            );
        });

        it('loads tile data with error', function (done) { 
            setupModel({
                numTilesError: 0,
                datalessGroups: [],
                tileResultFlags: [
                    {tileId: 1, groupId: 1, status: TileResultFlag.PENDING, canBeAmbiguousResult: false},
                    {tileId: 2, groupId: 1, status: TileResultFlag.PENDING, canBeAmbiguousResult: false},
                    {tileId: 3, groupId: 2, status: TileResultFlag.EMPTY_RESULT, canBeAmbiguousResult: false}
                ]
            })
            .checkState(
                {name: ActionName.TileDataLoaded, error: Error(), payload: {tileId: 2, isEmpty: true, canBeAmbiguousResult: true}},
                ActionName.TileDataLoaded,
                state => {
                    assert.deepEqual(state.tileResultFlags[1], {tileId: 2, groupId: 1, status: TileResultFlag.ERROR, canBeAmbiguousResult: true});
                    assert.deepEqual(state.datalessGroups, []);
                    assert.equal(state.numTileErrors, 1);
                    done();
                }
            );
        });

        it('loads all tile data and resolves empty groups', function (done) { 
            setupModel({
                numTilesError: 0,
                datalessGroups: [],
                tileResultFlags: [
                    {tileId: 1, groupId: 1, status: TileResultFlag.EMPTY_RESULT, canBeAmbiguousResult: false},
                    {tileId: 2, groupId: 1, status: TileResultFlag.PENDING, canBeAmbiguousResult: false},
                    {tileId: 3, groupId: 2, status: TileResultFlag.VALID_RESULT, canBeAmbiguousResult: false}
                ]
            })
            .checkState(
                {name: ActionName.TileDataLoaded, payload: {tileId: 2, isEmpty: true, canBeAmbiguousResult: true}},
                ActionName.TileDataLoaded,
                state => {
                    assert.include(state.datalessGroups, 1);
                    done();
                }
            );
        });
    });

    describe('empty results', function () {
        it('sets empty result', function (done) {
            setupModel({
                datalessGroups: [],
                tileResultFlags: [
                    {tileId: 1, groupId: 1, status: TileResultFlag.VALID_RESULT, canBeAmbiguousResult: false},
                    {tileId: 2, groupId: 1, status: TileResultFlag.PENDING, canBeAmbiguousResult: true},
                    {tileId: 3, groupId: 2, status: TileResultFlag.ERROR, canBeAmbiguousResult: false}
                ]
            })
            .checkState(
                {name: ActionName.SetEmptyResult},
                ActionName.SetEmptyResult,
                (state, appServices) => {
                    assert.isTrue(state.tileResultFlags.every(v => v.canBeAmbiguousResult === false));
                    assert.isTrue(state.tileResultFlags.every(v => v.status === TileResultFlag.EMPTY_RESULT));
                    assert.include(state.datalessGroups, 1);
                    assert.include(state.datalessGroups, 2);
                    assert.isFalse(appServices.showMessage.called);
                    done();
                }
            );
        });

        it('sets empty result and shows error message', function (done) {
            setupModel({
                datalessGroups: [],
                tileResultFlags: [
                    {tileId: 1, groupId: 1, status: TileResultFlag.VALID_RESULT, canBeAmbiguousResult: false},
                    {tileId: 2, groupId: 1, status: TileResultFlag.PENDING, canBeAmbiguousResult: true},
                    {tileId: 3, groupId: 2, status: TileResultFlag.ERROR, canBeAmbiguousResult: false}
                ]
            })
            .checkState(
                {name: ActionName.SetEmptyResult, payload: {error: Error()}},
                ActionName.SetEmptyResult,
                (state, appServices) => {
                    assert.isTrue(state.tileResultFlags.every(v => v.canBeAmbiguousResult === false));
                    assert.isTrue(state.tileResultFlags.every(v => v.status === TileResultFlag.EMPTY_RESULT));
                    assert.include(state.datalessGroups, 1);
                    assert.include(state.datalessGroups, 2);
                    assert.isTrue(appServices.showMessage.calledWith(SystemMessageType.ERROR));
                    done();
                }
            );
        });
    });

    describe('ambiguous results', function () {
        it('shows ambiguous results', function (done) {
            setupModel({showAmbiguousResultHelp: false})
            .checkState(
                {name: ActionName.ShowAmbiguousResultHelp},
                ActionName.ShowAmbiguousResultHelp,
                state => {
                    assert.isTrue(state.showAmbiguousResultHelp);
                    done();
                }
            );
        });

        it('hides ambiguous results', function (done) {
            setupModel({showAmbiguousResultHelp: true})
            .checkState(
                {name: ActionName.HideAmbiguousResultHelp},
                ActionName.HideAmbiguousResultHelp,
                state => {
                    assert.isFalse(state.showAmbiguousResultHelp);
                    done();
                }
            );
        });
    });
});