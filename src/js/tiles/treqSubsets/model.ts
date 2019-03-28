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
import { Action, ActionDispatcher, SEDispatcher, StatelessModel } from 'kombo';

import { TreqAPI, TreqTranslation } from '../../common/api/treq';
import { stateToAPIArgs, TreqModelMinState } from '../../common/models/treq';
import { ActionName as GlobalActionName, Actions as GlobalActions } from '../../models/actions';
import { WdglanceMainFormModel } from '../../models/query';
import { DataLoadedPayload } from './actions';
import { callWithRequestId } from '../../common/api/util';


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
}

export interface MultiSrcTranslation {
    value:string;
    abs:number;
    perc:number;
}

// transpose "package-first" oriented data structure to "word first" and emit values for each row
export const flipRowColMapper = <T>(subsets:Immutable.List<TranslationSubset>, mapFn:(row:Immutable.List<MultiSrcTranslation>, word:string, idx:number)=>T):Immutable.List<T> => {
    const numRows = Math.min(...subsets.map(s => s.translations.size).toArray());
    const numCols = subsets.size;
    const ans:Array<T> = [];

    for (let i = 0; i < numRows; i += 1) {
        const row:Array<MultiSrcTranslation> = [];
        for (let j = 0; j < numCols; j += 1) {
            const t = subsets.get(j).translations.get(i);
            row.push({
                value: t.left,
                abs: t.freq,
                perc: t.perc
            });
        }
        ans.push(mapFn(Immutable.List<MultiSrcTranslation>(row), subsets.get(0).translations.get(i).right, i));
    }
    return Immutable.List<T>(ans);
};


export class TreqSubsetModel extends StatelessModel<TreqSubsetsModelState> {


    private readonly tileId:number;

    private readonly api:TreqAPI;

    private readonly mainForm:WdglanceMainFormModel;

    constructor(dispatcher:ActionDispatcher, initialState:TreqSubsetsModelState, tileId:number, api:TreqAPI,
            mainForm:WdglanceMainFormModel) {
        super(dispatcher, initialState);
        this.api = api;
        this.tileId = tileId;
        this.mainForm = mainForm;
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
                            translations: Immutable.List<TreqTranslation>(action.payload.data.lines),
                            isPending: false
                        });
                        this.mkWordUnion(newState);
                        if (!newState.subsets.find(v => v.isPending)) {
                            this.cutResults(newState);
                            newState.isBusy = false;
                        }
                        return newState;
                    }
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
        };
    }

    private cutResults(state:TreqSubsetsModelState):void {
        state.subsets = state.subsets.map(subset => ({
            ident: subset.ident,
            label: subset.label,
            packages: subset.packages,
            translations: subset.translations.slice(0, 10).toList(),
            isPending: false
        })).toList();
    }

    private mkWordUnion(state:TreqSubsetsModelState):void {
        const allWords = state.subsets
            .flatMap(subset => subset.translations)
            .groupBy(v => v.right)
            .toOrderedMap()
            .map(v => v.reduce((acc, curr) => acc + curr.perc, 0))
            .sort((v1, v2) => v2 - v1)
            .keySeq();

        state.subsets = state.subsets.map(subset => ({
            ident: subset.ident,
            label: subset.label,
            packages: subset.packages,
            translations: allWords.map(w => {
                const srch = subset.translations.find(v => v.right === w);
                if (srch) {
                    return {
                        freq: srch.freq,
                        perc: srch.perc,
                        left: srch.left,
                        right: srch.right,
                        interactionId: srch.interactionId
                    }
                }
                return {
                    freq: 0,
                    perc: 0,
                    left: '',
                    right: w,
                    interactionId: null
                }
            }).toList(),
            isPending: false
        })).toList();
    }


    sideEffects(state:TreqSubsetsModelState, action:Action, dispatch:SEDispatcher):void {
        switch (action.name) {
            case GlobalActionName.RequestQueryResponse:
                merge(...state.subsets.map(subset =>
                        callWithRequestId(this.api, stateToAPIArgs(state, this.mainForm.getState().query.value, subset.packages), subset.ident)
                ).toArray())
                .subscribe(
                    (resp) => {
                        const [data, reqId] = resp;
                        dispatch<GlobalActions.TileDataLoaded<DataLoadedPayload>>({
                            name: GlobalActionName.TileDataLoaded,
                            payload: {
                                tileId: this.tileId,
                                isEmpty: data.lines.length === 0,
                                query: this.mainForm.getState().query.value,
                                data: data,
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
                                data: {lines: [], sum: -1},
                                subsetId: null
                            },
                            error: error
                        });
                        console.log(error);
                    }
                );
            break;
        }
    }


}
