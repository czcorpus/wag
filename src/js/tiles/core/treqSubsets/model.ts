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

import { of as rxOf } from 'rxjs';
import { StatelessModel, IActionQueue } from 'kombo';

import { mkInterctionId, TreqSubsetsAPI } from '../../../common/api/treq';
import { ActionName as GlobalActionName, Actions as GlobalActions } from '../../../models/actions';
import { findCurrQueryMatch } from '../../../models/query';
import { DataLoadedPayload } from './actions';
import { callWithExtraVal } from '../../../common/api/util';
import { isSubqueryPayload, RecognizedQueries } from '../../../common/query';
import { isCollocSubqueryPayload } from '../../../common/api/abstract/collocations';
import { TranslationSubset, TranslationsSubsetsModelState } from '../../../common/models/translations';
import { AppServices } from '../../../appServices';
import { pipe, List, Dict } from 'cnc-tskit';
import { mergeMap, reduce, tap } from 'rxjs/operators';



export interface MultiSrcTranslationRow {
    idx:number;
    heading:string;
    cells:Array<MultiSrcTranslationCell>;
    color:string;
}


export interface MultiSrcTranslationCell {
    abs:number;
    perc:number;
}


// transpose "package-first" oriented data structure to "word first" and emit values for each row
export const flipRowColMapper = <T>(subsets:Array<TranslationSubset>, maxNumLines:number,
            mapFn:(row:MultiSrcTranslationRow)=>T):Array<T> => {
    const numRows = Math.min(...subsets.map(s => s.translations.length));
    const numCols = subsets.length;
    const tmp:Array<MultiSrcTranslationRow> = [];

    for (let i = 0; i < numRows; i += 1) {
        const row:Array<MultiSrcTranslationCell> = [];
        for (let j = 0; j < numCols; j += 1) {
            const t = subsets[j].translations[i];
            row.push({
                abs: t.freq,
                perc: t.score
            });
        }

        const fitem = subsets[0].translations[i];
        const variants = Dict.fromEntries(
                pipe(
                    subsets,
                    List.flatMap(
                        subs => subs.translations[i].translations,
                    ),
                    List.map(v => {
                        const ans:[string, true] = [v, true];
                        return ans;
                    })
                )
        );
        tmp.push({
            idx: i,
            heading: Dict.size(variants) > 1 ? fitem.firstTranslatLc : fitem.translations[0],
            cells: [...row],
            color: subsets[0].translations[i].color
        });
    }
    return pipe(
        tmp,
        List.sort((v1, v2) => v2.cells.reduce((acc, curr) => acc + curr.perc, 0) - v1.cells.reduce((acc, curr) => acc + curr.perc, 0)),
        List.slice(0, maxNumLines),
        List.map(row => mapFn(row))
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

        this.addActionHandler<GlobalActions.RequestQueryResponse>(
            GlobalActionName.RequestQueryResponse,
            (state, action) => {
                state.isBusy = true;
                state.error = null;
                state.subsets = List.map(
                    v => ({
                        ident: v.ident,
                        label: v.label,
                        packages: v.packages,
                        translations: v.translations
                    }),
                    state.subsets
                );
            },
            (state, action, dispatch) => {
                const srchLemma = findCurrQueryMatch(this.lemmas[0]);
                rxOf(...state.subsets).pipe(
                    mergeMap(subset =>
                        callWithExtraVal(
                            this.api,
                            this.api.stateToArgs(
                                state,
                                srchLemma.lemma,
                                subset.packages
                            ),
                            subset.ident
                        )
                    ),
                    tap(
                        ([data, reqId]) => {
                            dispatch<GlobalActions.TilePartialDataLoaded<DataLoadedPayload>>({
                                name: GlobalActionName.TilePartialDataLoaded,
                                payload: {
                                    tileId: this.tileId,
                                    query: srchLemma.word, // TODO give up
                                    lines: List.filter(
                                        v => v.freq >= state.minItemFreq,
                                        data.translations
                                    ),
                                    sum: List.reduce(
                                        (acc, curr) => acc + curr.freq,
                                        0,
                                        data.translations
                                    ),
                                    subsetId: reqId
                                }
                            });
                        }
                    ),
                    reduce(
                        (acc, [resp,]) => acc && resp.translations.length === 0,
                        true // empty
                    )

                ).subscribe(
                    (isEmpty) => {
                        dispatch<GlobalActions.TileDataLoaded<{}>>({
                            name: GlobalActionName.TileDataLoaded,
                            payload: {
                                tileId: this.tileId,
                                isEmpty: isEmpty
                            }
                        })
                    },
                    (error) => {
                        dispatch<GlobalActions.TileDataLoaded<DataLoadedPayload>>({
                            name: GlobalActionName.TileDataLoaded,
                            payload: {
                                tileId: this.tileId,
                                isEmpty: true,
                                query: findCurrQueryMatch(this.lemmas[0]).word,
                                lines: [],
                                sum: -1,
                                subsetId: null
                            },
                            error: error
                        });
                        console.error(error);
                    }
                );
            }
        );

        this.addActionHandler<GlobalActions.TileDataLoaded<{}>>(
            GlobalActionName.TileDataLoaded,
            (state, action) => {
                if (action.payload.tileId === this.tileId) {
                    state.isBusy = false;
                    if (action.error) {
                        state.error = action.error.message;
                    }

                } else if (action.payload.tileId === this.waitForColorsTile) {
                    const payload = action.payload;
                    if (isCollocSubqueryPayload(payload)) {
                        state.colorMap = Dict.fromEntries(payload.subqueries.map(sq => [sq.value.value, sq.color]));

                    } else if (isSubqueryPayload(payload)) {
                        state.colorMap = Dict.fromEntries(payload.subqueries.map(sq => [sq.value, sq.color]));

                    } else {
                        state.colorMap = {};
                    }
                    state.subsets = pipe(
                        state.subsets,
                        List.map((subset) => ({
                            ident: subset.ident,
                            label: subset.label,
                            packages: subset.packages,
                            translations: List.map(
                                tran => ({
                                    freq: tran.freq,
                                    score: tran.score,
                                    word: tran.word,
                                    translations: tran.translations,
                                    firstTranslatLc: tran.firstTranslatLc,
                                    interactionId: tran.interactionId,
                                    color: state.colorMap[tran.firstTranslatLc] || TreqSubsetModel.UNMATCHING_ITEM_COLOR
                                }),
                                subset.translations
                            )
                        }))
                    );
                }
            }
        );

        this.addActionHandler<GlobalActions.TilePartialDataLoaded<DataLoadedPayload>>(
            GlobalActionName.TilePartialDataLoaded,
            (state, action) => {
                if (action.payload.tileId === this.tileId) {
                    const srchIdx = state.subsets.findIndex(v => v.ident === action.payload.subsetId);
                    if (srchIdx > -1) {
                        const val = state.subsets[srchIdx];
                        state.subsets[srchIdx] = {
                            ident: val.ident,
                            label: val.label,
                            packages: val.packages,
                            translations: List.map(
                                tran => ({
                                    freq: tran.freq,
                                    score: tran.score,
                                    word: tran.word,
                                    translations: tran.translations,
                                    firstTranslatLc: tran.firstTranslatLc,
                                    interactionId: tran.interactionId,
                                    color: state.colorMap[tran.firstTranslatLc] || TreqSubsetModel.UNMATCHING_ITEM_COLOR
                                }),
                                action.payload.lines
                            )
                        };
                        this.mkWordUnion(state);
                    }
                }
            }
        );

        this.addActionHandler<GlobalActions.EnableAltViewMode>(
            GlobalActionName.EnableAltViewMode,
            (state, action) => {
                if (action.payload.ident === this.tileId) {
                    state.isAltViewMode = true;
                }
            }
        );

        this.addActionHandler<GlobalActions.DisableAltViewMode>(
            GlobalActionName.DisableAltViewMode,
            (state, action) => {
                if (action.payload.ident === this.tileId) {
                    state.isAltViewMode = false;
                }
            }
        );

        this.addActionHandler<GlobalActions.SubqItemHighlighted>(
            GlobalActionName.SubqItemHighlighted,
            (state, action) => {
                const srchIdx = state.subsets[0].translations.findIndex(v => v.interactionId === action.payload.interactionId);
                if (srchIdx > -1) {
                    state.highlightedRowIdx = srchIdx;
                }
            }
        );

        this.addActionHandler<GlobalActions.SubqItemDehighlighted>(
            GlobalActionName.SubqItemDehighlighted,
            (state, action) => {
                const srchIdx = state.subsets[0].translations.findIndex(v => v.interactionId === action.payload.interactionId);
                if (srchIdx > -1) {
                    state.highlightedRowIdx = -1;
                }
            }
        );

        this.addActionHandler<GlobalActions.GetSourceInfo>(
            GlobalActionName.GetSourceInfo,
            null,
            (state, action, dispatch) => {
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
            }
        );
    }

    private mkWordUnion(state:TranslationsSubsetsModelState):void {
        const allWords = pipe(
            state.subsets,
            List.flatMap(subset => subset.translations),
            List.groupBy(v => v.firstTranslatLc),
            List.map(([translat ,v]) => {
                const ans:[string, number] = [translat, List.reduce((acc, curr) => acc + curr.score, 0, v)];
                return ans;
            }),
            List.sort(([,v1], [,v2]) => v2 - v1),
            List.map(([idx,]) => idx)
        );

        state.subsets = state.subsets.map(subset => ({
            ident: subset.ident,
            label: subset.label,
            packages: subset.packages,
            translations: List.map(
                w => {
                    const srch = List.find(v => v.firstTranslatLc === w, subset.translations);
                    if (srch) {
                        return {
                            freq: srch.freq,
                            score: srch.score,
                            word: srch.word,
                            translations: srch.translations,
                            firstTranslatLc: srch.firstTranslatLc,
                            interactionId: srch.interactionId,
                            color: Dict.get(srch.firstTranslatLc, TreqSubsetModel.UNMATCHING_ITEM_COLOR, state.colorMap)
                        };
                    }
                    return {
                        freq: 0,
                        score: 0,
                        word: '',
                        translations: [w],
                        firstTranslatLc: w.toLowerCase(),
                        color: Dict.get(w.toLowerCase(), TreqSubsetModel.UNMATCHING_ITEM_COLOR, state.colorMap),
                        interactionId: mkInterctionId(w.toLowerCase())
                    }
                },
                allWords
            )
        }));
    }

}
