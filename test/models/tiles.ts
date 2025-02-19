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

import { TestModelWrapper } from '../framework.js';

import sinon from 'sinon';
import { assert } from 'chai';

import { WdglanceTilesModel, WdglanceTilesState, TileResultFlag } from '../../src/js/models/tiles.js';
import { Actions } from '../../src/js/models/actions.js';
import { Observable, of as rxOf, throwError } from 'rxjs';
import { SystemMessageType } from '../../src/js/types.js';


describe('WdglanceTilesModel', function () {
    function setupModel(initialStateOverrides = {}, ajaxObservable?:Observable<any>):TestModelWrapper<WdglanceTilesModel, WdglanceTilesState> {
        return new TestModelWrapper(
            (dispatcher, appServices) => new WdglanceTilesModel(
                dispatcher,
                {...initialStateOverrides} as WdglanceTilesState,
                appServices,
            ),
            ajaxObservable ? { ajax$: ajaxObservable } : {}
        );
    }

    this.afterEach(function () {
        sinon.restore();
    });

    it('sets screen mode', function (done) {
        setupModel()
        .checkState(
            {name: Actions.SetScreenMode.name, payload: {isMobile: true}},
            Actions.SetScreenMode.name,
            state => {
                assert.isTrue(state.isMobile);
                done();
            }
        );
    });

    it('sets tile render size', function (done) {
        setupModel({tileProps: [{tileId: 1}]})
        .checkState(
            {name: Actions.SetTileRenderSize.name, payload: {tileId: 1, size: [10, 20]}},
            Actions.SetTileRenderSize.name,
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
                {name: Actions.EnableAltViewMode.name, payload: {ident: 1}},
                Actions.EnableAltViewMode.name,
                state => {
                    assert.include(state.altViewActiveTiles, 1);
                    done();
                }
            );
        });

        it('enables alt view mode again', function (done) {
            setupModel({altViewActiveTiles: [1]})
            .checkState(
                {name: Actions.EnableAltViewMode.name, payload: {ident: 1}},
                Actions.EnableAltViewMode.name,
                state => {
                    assert.deepEqual(state.altViewActiveTiles, [1]);
                    done();
                }
            );
        });

        it('disables alt view mode', function (done) {
            setupModel({altViewActiveTiles: [1, 2, 3]})
            .checkState(
                {name: Actions.DisableAltViewMode.name, payload: {ident: 2}},
                Actions.DisableAltViewMode.name,
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
                {name: Actions.EnableTileTweakMode.name, payload: {ident: 1}},
                Actions.EnableTileTweakMode.name,
                state => {
                    assert.include(state.tweakActiveTiles, 1);
                    done();
                }
            );
        });

        it('enables tweak mode again', function (done) {
            setupModel({tweakActiveTiles: [1]})
            .checkState(
                {name: Actions.EnableTileTweakMode.name, payload: {ident: 1}},
                Actions.EnableTileTweakMode.name,
                state => {
                    assert.deepEqual(state.tweakActiveTiles, [1]);
                    done();
                }
            );
        });

        it('disables tweak mode', function (done) {
            setupModel({tweakActiveTiles: [1, 2, 3]})
            .checkState(
                {name: Actions.DisableTileTweakMode.name, payload: {ident: 2}},
                Actions.DisableTileTweakMode.name,
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
                {name: Actions.ShowTileHelp.name, payload: {tileId: 1}},
                Actions.ShowTileHelp.name,
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
                {name: Actions.ShowTileHelp.name, payload: {tileId: 0}},
                Actions.LoadTileHelpDone.name,
                state => {
                    assert.equal(state.activeTileHelp, null);
                    assert.isFalse(state.isBusy);
                    done();
                }
            );
        });

        it('tests tile help side effect correct url', function (done) {
            setupModel({tileProps: [{helpURL: 'somewhere'}]}, rxOf('<div/>'))
            .checkState(
                {name: Actions.ShowTileHelp.name, payload: {tileId: 0}},
                Actions.LoadTileHelpDone.name,
                state => {
                    assert.deepEqual(state.activeTileHelp, {html: '<div/>', ident: 0});
                    assert.isFalse(state.isBusy);
                    done();
                }
            );
        });

        it('tests tile help side effect ajax error', function (done) {
            setupModel({tileProps: [{helpURL: 'somewhere'}]}, throwError(() => new Error()))
            .checkState(
                {name: Actions.ShowTileHelp.name, payload: {tileId: 0}},
                Actions.LoadTileHelpDone.name,
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
                {name: Actions.LoadTileHelpDone.name, payload: {tileId: 1, html: '<div/>'}},
                Actions.LoadTileHelpDone.name,
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
                {name: Actions.LoadTileHelpDone.name, error: Error()},
                Actions.LoadTileHelpDone.name,
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
                {name: Actions.HideTileHelp.name},
                Actions.HideTileHelp.name,
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
                {name: Actions.GetSourceInfo.name, payload: {tileId: 1}},
                Actions.GetSourceInfo.name,
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
                {name: Actions.GetSourceInfoDone.name, error: Error()},
                Actions.GetSourceInfoDone.name,
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
                {name: Actions.GetSourceInfoDone.name, payload: {data: {tileId: 1, title: 'title', description: 'desc', author: 'auth'}}},
                Actions.GetSourceInfoDone.name,
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
                {name: Actions.CloseSourceInfo.name},
                Actions.CloseSourceInfo.name,
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
                {name: Actions.ToggleGroupVisibility.name, payload: {groupIdx: 2}},
                Actions.ToggleGroupVisibility.name,
                state => {
                    assert.include(state.hiddenGroups, 2);
                    done();
                }
            );
        });

        it('toggles group visibility on', function (done) {
            setupModel({hiddenGroups: [1, 2, 3]})
            .checkState(
                {name: Actions.ToggleGroupVisibility.name, payload: {groupIdx: 2}},
                Actions.ToggleGroupVisibility.name,
                state => {
                    assert.notInclude(state.hiddenGroups, 2);
                    done();
                }
            );
        });

        /* TODO fix broken test (https://github.com/czcorpus/wag/issues/1042)
        it('opens group and highlights tile side effect', function (done) {
            let highlightCount = 0;
            setupModel({hiddenGroups: [1, 2, 3]})
            .checkState(
                {name: Actions.OpenGroupAndHighlightTile.name, payload: {groupIdx: 1, tileId: 1}},
                Actions.HighlightTile.name,
                state => {
                    highlightCount += 1;
                    if (highlightCount >= 9) {
                        assert.deepEqual(state.hiddenGroups, [2, 3]);
                        assert.equal(state.highlightedTileId, 1);
                        assert.equal(highlightCount, 9);
                    }
                    done();
                }
            );
        });
        */
    });

    describe('tile highlight', function () {
        it('highlights tile', function (done) {
            setupModel()
            .checkState(
                {name: Actions.HighlightTile.name, payload: {tileId: 1}},
                Actions.HighlightTile.name,
                state => {
                    assert.equal(state.highlightedTileId, 1);
                    done();
                }
            );
        });

        it('dehighlights tile', function (done) {
            setupModel()
            .checkState(
                {name: Actions.DehighlightTile.name},
                Actions.DehighlightTile.name,
                state => {
                    assert.equal(state.highlightedTileId, -1);
                    done();
                }
            );
        });
    });

    describe('group help', function () {
        it('starts showing group help', function (done) {
            setupModel({}, rxOf('<div/>'))
            .checkState(
                {name: Actions.ShowGroupHelp.name, payload: {groupIdx: 1, url: 'somewhere'}},
                Actions.ShowGroupHelp.name,
                state => {
                    assert.isTrue(state.isBusy);
                    assert.deepEqual(state.activeGroupHelp, {html: '', idx: 1});
                    done();
                }
            );
        });

        it('tests showing group help side effect error', function (done) {
            setupModel({}, throwError(() => new Error()))
            .checkState(
                {name: Actions.ShowGroupHelp.name, payload: {groupIdx: 1, url: 'somewhere'}},
                Actions.ShowGroupHelpDone.name,
                (state, appServices) => {
                    assert.equal(state.activeGroupHelp, null);
                    assert.isFalse(state.isBusy);
                    assert.isTrue(appServices.showMessage.calledWith(SystemMessageType.ERROR));
                    done();
                }
            );
        });

        it('tests showing group help side effect successfull', function (done) {
            setupModel({}, rxOf('<div/>'))
            .checkState(
                {name: Actions.ShowGroupHelp.name, payload: {groupIdx: 1, url: 'somewhere'}},
                Actions.ShowGroupHelpDone.name,
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
                {name: Actions.ShowGroupHelpDone.name, payload: {html: '<div/>', groupIdx: 1}},
                Actions.ShowGroupHelpDone.name,
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
                {name: Actions.ShowGroupHelpDone.name, error: Error()},
                Actions.ShowGroupHelpDone.name,
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
                {name: Actions.HideGroupHelp.name},
                Actions.HideGroupHelp.name,
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
            {name: Actions.RequestQueryResponse.name},
            Actions.RequestQueryResponse.name,
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
                {name: Actions.TileDataLoaded.name, payload: {tileId: 2, isEmpty: false, canBeAmbiguousResult: true}},
                Actions.TileDataLoaded.name,
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
                {name: Actions.TileDataLoaded.name, payload: {tileId: 2, isEmpty: true, canBeAmbiguousResult: true}},
                Actions.TileDataLoaded.name,
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
                {name: Actions.TileDataLoaded.name, error: Error(), payload: {tileId: 2, isEmpty: true, canBeAmbiguousResult: true}},
                Actions.TileDataLoaded.name,
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
                {name: Actions.TileDataLoaded.name, payload: {tileId: 2, isEmpty: true, canBeAmbiguousResult: true}},
                Actions.TileDataLoaded.name,
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
                {name: Actions.SetEmptyResult.name},
                Actions.SetEmptyResult.name,
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
                {name: Actions.SetEmptyResult.name, payload: {error: Error()}},
                Actions.SetEmptyResult.name,
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
                {name: Actions.ShowAmbiguousResultHelp.name},
                Actions.ShowAmbiguousResultHelp.name,
                state => {
                    assert.isTrue(state.showAmbiguousResultHelp);
                    done();
                }
            );
        });

        it('hides ambiguous results', function (done) {
            setupModel({showAmbiguousResultHelp: true})
            .checkState(
                {name: Actions.HideAmbiguousResultHelp.name},
                Actions.HideAmbiguousResultHelp.name,
                state => {
                    assert.isFalse(state.showAmbiguousResultHelp);
                    done();
                }
            );
        });
    });
});