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
import { map } from 'rxjs/operators';

import { StatelessModel, Action, SEDispatcher, IActionQueue } from 'kombo';
import { WordFormItem, WordFormsApi, RequestConcArgs, RequestArgs } from '../../common/api/abstract/wordForms';
import { ActionName as GlobalActionName, Actions as GlobalActions } from '../../models/actions';
import { DataLoadedPayload } from './actions';
import { QueryFormModel, findCurrLemmaVariant } from '../../models/query';
import { ConcLoadedPayload } from '../concordance/actions';
import { calcPercentRatios } from '../../common/util';
import { AlphaLevel, wilsonConfInterval } from '../timeDistrib/stat';
import { AjaxTimeoutError } from 'rxjs/ajax';




export interface WordFormsModelState {
    isBusy:boolean;
    isAltViewMode:boolean;
    error:string;
    corpname:string;
    roundToPos:number; // 0 to N
    corpusSize:number;
    freqFilterAlphaLevel:AlphaLevel;
    data:Immutable.List<WordFormItem>;
}

/**
 * We take in the consideration:
 * 1) absolute term frequency
 * 2) term ratio among other terms
 * For each item we check whether the lower end of a respective
 * Wilson score interval is non-zero (after rounding).
 */
function filterRareVariants(items:Immutable.List<WordFormItem>, corpSize:number, alpha:AlphaLevel):Immutable.List<WordFormItem> {
    const total = items.reduce(
        (acc, curr) => {
            return acc + curr.freq;
        },
        0
    );

    return items.filter(
        (value) => {
            const left = wilsonConfInterval(value.freq, total, alpha)[0] * 100;
            const abs = wilsonConfInterval(value.freq, corpSize, alpha)[0] * corpSize;
            return Math.round(left) > 0 && Math.round(abs) > 0;
        }
    ).toList();
}


export class WordFormsModel extends StatelessModel<WordFormsModelState> {

    private readonly tileId:number;

    private readonly api:WordFormsApi;

    private readonly mainForm:QueryFormModel;

    private readonly waitForTile:number|null;

    constructor(dispatcher:IActionQueue, initialState:WordFormsModelState, tileId:number, api:WordFormsApi, mainForm:QueryFormModel, waitForTile:number|null) {
        super(dispatcher, initialState);
        this.tileId = tileId;
        this.api = api;
        this.mainForm = mainForm;
        this.waitForTile = waitForTile;
        this.actionMatch = {
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
            [GlobalActionName.RequestQueryResponse]: (state, action:GlobalActions.RequestQueryResponse) => {
                const newState = this.copyState(state);
                newState.isBusy = true;
                newState.error = null;
                newState.data = newState.data.clear();
                return newState;
            },
            [GlobalActionName.TileDataLoaded]: (state, action:GlobalActions.TileDataLoaded<DataLoadedPayload>) => {
                if (action.payload.tileId === this.tileId) {
                    const newState = this.copyState(state);
                    newState.isBusy = false;
                    if (action.error) {
                        newState.error = action.error.message;

                    } else if (action.payload.data.length === 0) {
                        newState.data = Immutable.List<WordFormItem>();

                    } else {
                        newState.data = filterRareVariants(
                            Immutable.List<WordFormItem>(action.payload.data),
                            state.corpusSize,
                            state.freqFilterAlphaLevel
                        );
                    }
                    return newState;
                }
                return state;
            }
        };
    }

    private fetchWordForms(args:RequestArgs|RequestConcArgs, dispatch:SEDispatcher):void {
        this.api.call(args).pipe(
            map((v => {
                const updated = calcPercentRatios(
                    v.forms,
                    (item) => item.freq,
                    (item, ratio) => ({
                        value: item.value,
                        freq: item.freq,
                        ratio: ratio,
                        interactionId: item.interactionId
                    })
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
                        isEmpty: false,
                        data: data.forms,
                        subqueries: data.forms.map(v => ({
                            value: v.value,
                            interactionId: v.interactionId
                        })),
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

    sideEffects(state:WordFormsModelState, action:Action, dispatch:SEDispatcher):void {
        switch (action.name) {
            case GlobalActionName.RequestQueryResponse:
                if (this.waitForTile !== null) {
                    this.suspend(
                        (action:Action) => {
                            if (action.name === GlobalActionName.TileDataLoaded && action.payload['tileId'] === this.waitForTile) {

                                if (action.error) {
                                    console.log(action.error);
                                    dispatch<GlobalActions.TileDataLoaded<DataLoadedPayload>>({
                                        name: GlobalActionName.TileDataLoaded,
                                        error: action.error,
                                        payload: {
                                            tileId: this.tileId,
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
                                            corpName: payload.data.corpName,
                                            subcorpName: payload.data.subcorpName,
                                            concPersistenceID: payload.data.concPersistenceID
                                        },
                                        dispatch
                                    );
                                }
                                return true;
                            }
                            return false;
                        }
                    );

                } else {
                    const formState = this.mainForm.getState();
                    const variant = findCurrLemmaVariant(formState.lemmas);
                    this.fetchWordForms(
                        {
                            lang: formState.queryLanguage,
                            lemma: variant.lemma,
                            pos: variant.pos.map(v => v.value)
                        },
                        dispatch
                    );
                }

            break;
        }
    }
}