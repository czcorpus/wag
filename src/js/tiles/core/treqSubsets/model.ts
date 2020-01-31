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

import { mkInterctionId, TreqSubsetsAPI } from '../../../common/api/treq';
import { ActionName as GlobalActionName, Actions as GlobalActions } from '../../../models/actions';
import { findCurrLemmaVariant } from '../../../models/query';
import { DataLoadedPayload } from './actions';
import { callWithExtraVal } from '../../../common/api/util';
import { isSubqueryPayload, RecognizedQueries } from '../../../common/query';
import { isCollocSubqueryPayload } from '../../../common/api/abstract/collocations';
import { WordTranslation } from '../../../common/api/abstract/translations';
import { TranslationSubset, TranslationsSubsetsModelState } from '../../../common/models/translations';
import { AppServices } from '../../../appServices';



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
                perc: t.score
            });
        }

        const fitem = subsets.get(0).translations.get(i);
        const variants = Immutable.Set(subsets.flatMap(subs => subs.translations.get(i).translations));
        tmp.push({
            idx: i,
            heading: variants.size > 1 ? fitem.firstTranslatLc : fitem.translations[0],
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


export interface TreqSubsetModelArgs {
    dispatcher:IActionQueue;
    appServices:AppServices;
    initialState:TranslationsSubsetsModelState;
    tileId:number;
    api:TreqSubsetsAPI;
    lemmas:RecognizedQueries;
    waitForColorsTile:number;
}


export class TreqSubsetModel extends StatelessModel<TranslationsSubsetsModelState> {


    public static readonly UNMATCHING_ITEM_COLOR = '#878787';

    private readonly tileId:number;

    private readonly api:TreqSubsetsAPI;

    private readonly lemmas:RecognizedQueries;

    private readonly waitForColorsTile:number;

    private readonly appServices:AppServices;


    constructor({dispatcher, appServices, initialState, tileId, api, lemmas, waitForColorsTile}:TreqSubsetModelArgs) {
        super(dispatcher, initialState);
        this.api = api;
        this.tileId = tileId;
        this.lemmas = lemmas;
        this.waitForColorsTile = waitForColorsTile;
        this.appServices = appServices;
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
                            translations: Immutable.List<WordTranslation>(action.payload.lines).map(tran => ({
                                freq: tran.freq,
                                score: tran.score,
                                word: tran.word,
                                translations: tran.translations,
                                firstTranslatLc: tran.firstTranslatLc,
                                interactionId: tran.interactionId,
                                color: newState.colorMap.get(tran.firstTranslatLc, TreqSubsetModel.UNMATCHING_ITEM_COLOR)
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

    private mkWordUnion(state:TranslationsSubsetsModelState):void {
        const allWords = state.subsets
            .flatMap(subset => subset.translations)
            .groupBy(v => v.firstTranslatLc)
            .toOrderedMap()
            .map(v => v.reduce((acc, curr) => acc + curr.score, 0))
            .sort((v1, v2) => v2 - v1)
            .keySeq();

        state.subsets = state.subsets.map(subset => ({
            ident: subset.ident,
            label: subset.label,
            packages: subset.packages,
            translations: allWords.map(w => {
                const srch = subset.translations.find(v => v.firstTranslatLc === w);
                if (srch) {
                    return {
                        freq: srch.freq,
                        score: srch.score,
                        word: srch.word,
                        translations: srch.translations,
                        firstTranslatLc: srch.firstTranslatLc,
                        interactionId: srch.interactionId,
                        color: state.colorMap.get(srch.firstTranslatLc, TreqSubsetModel.UNMATCHING_ITEM_COLOR)
                    };
                }
                return {
                    freq: 0,
                    score: 0,
                    word: '',
                    translations: [w],
                    firstTranslatLc: w.toLowerCase(),
                    color: state.colorMap.get(w.toLowerCase(), TreqSubsetModel.UNMATCHING_ITEM_COLOR),
                    interactionId: mkInterctionId(w.toLowerCase())
                };
            }).toList(),
            isPending: false
        })).toList();
    }

    sideEffects(state:TranslationsSubsetsModelState, action:Action, dispatch:SEDispatcher):void {
        switch (action.name) {
            case GlobalActionName.RequestQueryResponse:
                this.suspend({}, (action, syncData) => {
                    const srchLemma = findCurrLemmaVariant(this.lemmas[0]);
                    if (action.name === GlobalActionName.TileDataLoaded && this.waitForColorsTile === action.payload['tileId']) {
                        merge(...state.subsets.map(subset =>
                            callWithExtraVal(
                                this.api,
                                this.api.stateToArgs(
                                    state,
                                    srchLemma.lemma,
                                    subset.packages
                                ),
                                subset.ident
                            )
                        ).toArray())
                        .subscribe(
                            (resp) => {
                                const [data, reqId] = resp;
                                const lines = data.translations.filter(v => v.freq >= state.minItemFreq);
                                const sum = data.translations.reduce((acc, curr) => acc + curr.freq, 0);
                                dispatch<GlobalActions.TileDataLoaded<DataLoadedPayload>>({
                                    name: GlobalActionName.TileDataLoaded,
                                    payload: {
                                        tileId: this.tileId,
                                        isEmpty: data.translations.length === 0,
                                        query: srchLemma.word, // TODO give up
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
                                        query: findCurrLemmaVariant(this.lemmas[0]).word,
                                        lines: [],
                                        sum: -1,
                                        subsetId: null
                                    },
                                    error: error
                                });
                                console.log(error);
                            }
                        );
                        return null;
                    }
                    return syncData;
                });
            break;
            case GlobalActionName.GetSourceInfo:
                if (action.payload['tileId'] === this.tileId) {
                    this.api.getSourceDescription(this.tileId, this.appServices.getISO639UILang(), action.payload['corpusId'])
                    .subscribe(
                        (data) => {
                            dispatch({
                                name: GlobalActionName.GetSourceInfoDone,
                                payload: {
                                    tileId: this.tileId,
                                    data: data
                                }
                            });
                        },
                        (err) => {
                            console.error(err);
                            dispatch({
                                name: GlobalActionName.GetSourceInfoDone,
                                error: err,
                                payload: {
                                    tileId: this.tileId
                                }
                            });
                        }
                    );
                }
            break;
        }
    }


}
