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
import { map } from 'rxjs/operators';
import { List, Maths } from 'cnc-tskit';

import { StatelessModel, Action, SEDispatcher, IActionQueue } from 'kombo';
import { WordFormItem, WordFormsApi, RequestConcArgs, RequestArgs } from '../../../common/api/abstract/wordForms';
import { ActionName as GlobalActionName, Actions as GlobalActions } from '../../../models/actions';
import { DataLoadedPayload } from './actions';
import { findCurrQueryMatch } from '../../../models/query';
import { ConcLoadedPayload } from '../concordanceTile/actions';
import { RecognizedQueries } from '../../../common/query';




export interface WordFormsModelState {
    isBusy:boolean;
    isAltViewMode:boolean;
    error:string;
    corpname:string;
    roundToPos:number; // 0 to N
    corpusSize:number;
    freqFilterAlphaLevel:Maths.AlphaLevel;
    data:Array<WordFormItem>;
}

/**
 * We take in the consideration:
 * 1) absolute term frequency
 * 2) term ratio among other terms
 * For each item we check whether the lower end of a respective
 * Wilson score interval is non-zero (after rounding).
 */
function filterRareVariants(items:Array<WordFormItem>, corpSize:number, alpha:Maths.AlphaLevel):Array<WordFormItem> {
    const total = List.reduce(
        (acc, curr) => {
            return acc + curr.freq;
        },
        0,
        items
    );

    return List.filter(
        (value) => {
            const left = Maths.wilsonConfInterval(value.freq, total, alpha)[0] * 100;
            const abs = Maths.wilsonConfInterval(value.freq, corpSize, alpha)[0] * corpSize;
            return Math.round(left) > 0 && Math.round(abs) > 0;
        },
        items
    );
}


export interface WordFormsModelArgs {
    dispatcher:IActionQueue;
    initialState:WordFormsModelState;
    tileId:number;
    api:WordFormsApi;
    queryMatches:RecognizedQueries;
    queryLang:string;
    waitForTile:number|null;
    waitForTilesTimeoutSecs:number;
}


export class WordFormsModel extends StatelessModel<WordFormsModelState> {

    private readonly tileId:number;

    private readonly api:WordFormsApi;

    private readonly queryMatches:RecognizedQueries;

    private readonly queryLang:string;

    private readonly waitForTile:number|null;

    private readonly waitForTilesTimeoutSecs:number;

    constructor({dispatcher, initialState, tileId, api, queryMatches, queryLang, waitForTile,
            waitForTilesTimeoutSecs}:WordFormsModelArgs) {
        super(dispatcher, initialState);
        this.tileId = tileId;
        this.api = api;
        this.queryMatches = queryMatches;
        this.queryLang = queryLang;
        this.waitForTile = waitForTile;
        this.waitForTilesTimeoutSecs = waitForTilesTimeoutSecs;

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

        this.addActionHandler<GlobalActions.RequestQueryResponse>(
            GlobalActionName.RequestQueryResponse,
            (state, action) => {
                state.isBusy = true;
                state.error = null;
                state.data = [];
            },
            (state, action, dispatch) => {
                if (this.waitForTile >= 0) {
                    this.suspendWithTimeout(
                        this.waitForTilesTimeoutSecs * 1000,
                        {},
                        (action:Action<{tileId:number}>, syncData) => {
                            if (action.name === GlobalActionName.TileDataLoaded && action.payload.tileId === this.waitForTile) {
                                if (action.error) {
                                    console.log(action.error);
                                    dispatch<GlobalActions.TileDataLoaded<DataLoadedPayload>>({
                                        name: GlobalActionName.TileDataLoaded,
                                        error: action.error,
                                        payload: {
                                            tileId: this.tileId,
                                            queryId: 0,
                                            isEmpty: true,
                                            data: [],
                                            subqueries: [],
                                            lang1: null,
                                            lang2: null
                                        }
                                    });

                                } else {
                                    const payload = (action as GlobalActions.TileDataLoaded<ConcLoadedPayload>).payload;
                                    this.fetchWordForms(
                                        {
                                            corpName: payload.corpusName,
                                            subcorpName: payload.subcorpusName,
                                            concPersistenceID: payload.concPersistenceIDs[0]
                                        },
                                        dispatch
                                    );
                                }
                                return null;
                            }
                            return syncData;
                        }
                    );

                } else {
                    const variant = findCurrQueryMatch(this.queryMatches[0]);
                    this.fetchWordForms(
                        {
                            lang: this.queryLang,
                            lemma: variant.lemma,
                            pos: List.map(v => v.value.join(' '), variant.pos)
                        },
                        dispatch
                    );
                }

            }
        );

        this.addActionHandler<GlobalActions.TileDataLoaded<DataLoadedPayload>>(
            GlobalActionName.TileDataLoaded,
            (state, action) => {
                if (action.payload.tileId === this.tileId) {
                    state.isBusy = false;
                    if (action.error) {
                        state.error = action.error.message;

                    } else if (action.payload.data.length === 0) {
                        state.data = [];

                    } else {
                        state.data = filterRareVariants(
                            action.payload.data,
                            state.corpusSize,
                            state.freqFilterAlphaLevel
                        );
                    }
                }
            }
        );
    }

    private fetchWordForms(args:RequestArgs|RequestConcArgs, dispatch:SEDispatcher):void {
        this.api.call(args).pipe(
            map((v => {
                const updated = Maths.calcPercentRatios(
                    (item) => item.freq,
                    (item, ratio) => ({
                        value: item.value,
                        freq: item.freq,
                        ratio: ratio,
                        interactionId: item.interactionId
                    }),
                    v.forms
                );
                return {
                    forms: updated
                };
            }))

        ).subscribe(
            (data) => {
                dispatch<GlobalActions.TileDataLoaded<DataLoadedPayload>>({
                    name: GlobalActionName.TileDataLoaded,
                    payload: {
                        tileId: this.tileId,
                        queryId: 0,
                        isEmpty: false,
                        data: List.sortBy(
                            x => -x.freq,
                            data.forms
                        ),
                        subqueries: List.map(
                            v => ({
                                value: v.value,
                                interactionId: v.interactionId
                            }),
                            data.forms
                        ),
                        lang1: null,
                        lang2: null
                    }
                });
            },
            (err) => {
                console.log(err);
                dispatch<GlobalActions.TileDataLoaded<DataLoadedPayload>>({
                    name: GlobalActionName.TileDataLoaded,
                    error: err,
                    payload: {
                        tileId: this.tileId,
                        queryId: 0,
                        isEmpty: true,
                        data: [],
                        subqueries: [],
                        lang1: null,
                        lang2: null
                    }
                });
            }
        );
    }
}
