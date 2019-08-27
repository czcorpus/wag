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
import * as Immutable from 'immutable';
import {merge} from 'rxjs';
import { Action, SEDispatcher, StatelessModel, IActionQueue } from 'kombo';

import { TreqAPI, TreqTranslation, mkInterctionId } from '../../common/api/treq';
import { stateToAPIArgs, TreqModelMinState } from '../../common/models/treq';
import { ActionName as GlobalActionName, Actions as GlobalActions } from '../../models/actions';
import { QueryFormModel } from '../../models/query';
import { DataLoadedPayload } from './actions';
import { callWithExtraVal } from '../../common/api/util';
import { isSubqueryPayload } from '../../common/query';
import { isCollocSubqueryPayload } from '../../common/api/abstract/collocations';


export interface TranslationSubset {
    ident:string;
    label:string;
    packages:Immutable.List<string>;
    translations:Immutable.List<TreqTranslation>;
    isPending:boolean;
}


export interface TreqSubsetsModelState extends TreqModelMinState {
    isBusy:boolean;
    error:string;
    isAltViewMode:boolean;
    subsets:Immutable.List<TranslationSubset>;
    highlightedRowIdx:number;
    maxNumLines:number;
    colorMap:Immutable.Map<string, string>;
}


export interface MultiSrcTranslationRow {
    idx:number;
    heading:string;
    cells:Immutable.List<MultiSrcTranslationCell>;
    color:string;
}


export interface MultiSrcTranslationCell {
    abs:number;
    perc:number;
}


// transpose "package-first" oriented data structure to "word first" and emit values for each row
export const flipRowColMapper = <T>(subsets:Immutable.List<TranslationSubset>, maxNumLines:number,
            mapFn:(row:MultiSrcTranslationRow)=>T):Immutable.List<T> => {
    const numRows = Math.min(...subsets.map(s => s.translations.size).toArray());
    const numCols = subsets.size;
    const tmp:Array<MultiSrcTranslationRow> = [];

    for (let i = 0; i < numRows; i += 1) {
        const row:Array<MultiSrcTranslationCell> = [];
        for (let j = 0; j < numCols; j += 1) {
            const t = subsets.get(j).translations.get(i);
            row.push({
                abs: t.freq,
                perc: t.perc
            });
        }

        const fitem = subsets.get(0).translations.get(i);
        const variants = Immutable.Set(subsets.flatMap(subs => subs.translations.get(i).right));
        tmp.push({
            idx: i,
            heading: variants.size > 1 ? fitem.rightLc : fitem.right[0],
            cells: Immutable.List<MultiSrcTranslationCell>(row),
            color: subsets.get(0).translations.get(i).color
        });
    }
    return Immutable.List<T>(
        tmp
            .sort((v1, v2) => v2.cells.reduce((acc, curr) => acc + curr.perc, 0) - v1.cells.reduce((acc, curr) => acc + curr.perc, 0))
            .slice(0, maxNumLines)
            .map(row => mapFn(row))
    );
};


export class TreqSubsetModel extends StatelessModel<TreqSubsetsModelState> {


    public static readonly UNMATCHING_ITEM_COLOR = '#878787';

    private readonly tileId:number;

    private readonly api:TreqAPI;

    private readonly mainForm:QueryFormModel;

    private readonly waitForColorsTile:number;


    constructor(dispatcher:IActionQueue, initialState:TreqSubsetsModelState, tileId:number, api:TreqAPI,
            mainForm:QueryFormModel, waitForColorsTile:number) {
        super(dispatcher, initialState);
        this.api = api;
        this.tileId = tileId;
        this.mainForm = mainForm;
        this.waitForColorsTile = waitForColorsTile;
        this.actionMatch = {
            [GlobalActionName.RequestQueryResponse]: (state, action:GlobalActions.RequestQueryResponse) => {
                const newState = this.copyState(state);
                newState.isBusy = true;
                newState.error = null;
                newState.subsets = newState.subsets.map(v => ({
                    ident: v.ident,
                    label: v.label,
                    packages: v.packages,
                    translations: v.translations,
                    isPending: true
                })).toList();
                return newState;
            },
            [GlobalActionName.TileDataLoaded]: (state, action:GlobalActions.TileDataLoaded<DataLoadedPayload>) => {
                if (action.payload.tileId === this.tileId) {
                    const srchIdx = state.subsets.findIndex(v => v.ident === action.payload.subsetId);
                    if (srchIdx > -1) {
                        const newState = this.copyState(state);
                        const val = newState.subsets.get(srchIdx);
                        newState.subsets = newState.subsets.set(srchIdx, {
                            ident: val.ident,
                            label: val.label,
                            packages: val.packages,
                            translations: Immutable.List<TreqTranslation>(action.payload.lines).map(tran => ({
                                freq: tran.freq,
                                perc: tran.perc,
                                left: tran.left,
                                right: tran.right,
                                rightLc: tran.rightLc,
                                interactionId: tran.interactionId,
                                color: newState.colorMap.get(tran.rightLc, TreqSubsetModel.UNMATCHING_ITEM_COLOR)
                            })).toList(),
                            isPending: false
                        });
                        this.mkWordUnion(newState);
                        if (!newState.subsets.find(v => v.isPending)) {
                            newState.isBusy = false;
                        }
                        return newState;
                    }

                } else if (action.payload.tileId === this.waitForColorsTile) {
                        const payload = action.payload;
                        const newState = this.copyState(state);
                        if (isCollocSubqueryPayload(payload)) {
                            newState.colorMap = Immutable.Map<string, string>(payload.subqueries.map(sq => [sq.value.value, sq.color]));

                        } else if (isSubqueryPayload(payload)) {
                            newState.colorMap = Immutable.Map<string, string>(payload.subqueries.map(sq => [sq.value, sq.color]));
                        }
                        return newState;
                }
                return state;
            },
            [GlobalActionName.EnableAltViewMode]: (state, action:GlobalActions.EnableAltViewMode) => {
                if (action.payload.ident === this.tileId) {
                    const newState = this.copyState(state);
                    newState.isAltViewMode = true;
                    return newState;
                }
                return state;
            },
            [GlobalActionName.DisableAltViewMode]: (state, action:GlobalActions.DisableAltViewMode) => {
                if (action.payload.ident === this.tileId) {
                    const newState = this.copyState(state);
                    newState.isAltViewMode = false;
                    return newState;
                }
                return state;
            },
            [GlobalActionName.SubqItemHighlighted] : (state, action:GlobalActions.SubqItemHighlighted) => {
                const srchIdx = state.subsets.get(0).translations.findIndex(v => v.interactionId === action.payload.interactionId);
                if (srchIdx > -1) {
                    const newState = this.copyState(state);
                    newState.highlightedRowIdx = srchIdx;
                    return newState;
                }
               return state;
            },
            [GlobalActionName.SubqItemDehighlighted] : (state, action:GlobalActions.SubqItemDehighlighted) => {
                const srchIdx = state.subsets.get(0).translations.findIndex(v => v.interactionId === action.payload.interactionId);
                if (srchIdx > -1) {
                    const newState = this.copyState(state);
                    newState.highlightedRowIdx = -1;
                    return newState;
                }
               return state;
            },
        };
    }

    private mkWordUnion(state:TreqSubsetsModelState):void {
        const allWords = state.subsets
            .flatMap(subset => subset.translations)
            .groupBy(v => v.rightLc)
            .toOrderedMap()
            .map(v => v.reduce((acc, curr) => acc + curr.perc, 0))
            .sort((v1, v2) => v2 - v1)
            .keySeq();

        state.subsets = state.subsets.map(subset => ({
            ident: subset.ident,
            label: subset.label,
            packages: subset.packages,
            translations: allWords.map(w => {
                const srch = subset.translations.find(v => v.rightLc === w);
                if (srch) {
                    return {
                        freq: srch.freq,
                        perc: srch.perc,
                        left: srch.left,
                        right: srch.right,
                        rightLc: srch.rightLc,
                        interactionId: srch.interactionId,
                        color: state.colorMap.get(srch.rightLc, TreqSubsetModel.UNMATCHING_ITEM_COLOR)
                    };
                }
                return {
                    freq: 0,
                    perc: 0,
                    left: '',
                    right: [w],
                    rightLc: w.toLowerCase(),
                    color: state.colorMap.get(w.toLowerCase(), TreqSubsetModel.UNMATCHING_ITEM_COLOR),
                    interactionId: mkInterctionId(w.toLowerCase())
                };
            }).toList(),
            isPending: false
        })).toList();
    }

    sideEffects(state:TreqSubsetsModelState, action:Action, dispatch:SEDispatcher):void {
        switch (action.name) {
            case GlobalActionName.RequestQueryResponse:
                this.suspend(
                    (action:Action) => {
                        if (action.name === GlobalActionName.TileDataLoaded && this.waitForColorsTile === action.payload['tileId']) {
                            merge(...state.subsets.map(subset =>
                                callWithExtraVal(
                                    this.api,
                                    stateToAPIArgs(
                                        state,
                                        this.mainForm.getState().query.value,
                                        subset.packages
                                    ),
                                    subset.ident
                                )
                            ).toArray())
                            .subscribe(
                                (resp) => {
                                    const [data, reqId] = resp;
                                    const lines = data.lines.filter(v => v.freq >= state.minItemFreq);
                                    const sum = data.lines.reduce((acc, curr) => acc + curr.freq, 0);
                                    dispatch<GlobalActions.TileDataLoaded<DataLoadedPayload>>({
                                        name: GlobalActionName.TileDataLoaded,
                                        payload: {
                                            tileId: this.tileId,
                                            isEmpty: data.lines.length === 0,
                                            query: this.mainForm.getState().query.value,
                                            lines: lines,
                                            sum: sum,
                                            subsetId: reqId
                                        }
                                    });
                                },
                                (error) => {
                                    dispatch<GlobalActions.TileDataLoaded<DataLoadedPayload>>({
                                        name: GlobalActionName.TileDataLoaded,
                                        payload: {
                                            tileId: this.tileId,
                                            isEmpty: true,
                                            query: this.mainForm.getState().query.value,
                                            lines: [],
                                            sum: -1,
                                            subsetId: null
                                        },
                                        error: error
                                    });
                                    console.log(error);
                                }
                            );
                            return true;
                        }
                        return false;
                    }
                );
            break;
        }
    }


}
