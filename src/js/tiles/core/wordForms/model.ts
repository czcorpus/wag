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

import { StatelessModel, SEDispatcher, IActionQueue } from 'kombo';
import { WordFormItem, IWordFormsApi, RequestConcArgs, RequestArgs } from '../../../api/abstract/wordForms';
import { Actions as GlobalActions } from '../../../models/actions';
import { Actions as ConcActions } from '../concordance/actions';
import { Actions } from './actions';
import { findCurrQueryMatch } from '../../../models/query';
import { RecognizedQueries } from '../../../query/index';
import { IAppServices } from '../../../appServices';
import { isWebDelegateApi } from '../../../types';
import { Backlink, BacklinkWithArgs, createAppBacklink } from '../../../page/tile';




export interface WordFormsModelState {
    isBusy:boolean;
    isAltViewMode:boolean;
    error:string;
    corpname:string;
    roundToPos:number; // 0 to N
    corpusSize:number;
    freqFilterAlphaLevel:Maths.AlphaLevel;
    data:Array<WordFormItem>;
    backlink:BacklinkWithArgs<{}>;
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
    api:IWordFormsApi;
    queryMatches:RecognizedQueries;
    queryDomain:string;
    waitForTile:number|null;
    waitForTilesTimeoutSecs:number;
    appServices:IAppServices;
    backlink:Backlink
}


export class WordFormsModel extends StatelessModel<WordFormsModelState> {

    private readonly tileId:number;

    private readonly api:IWordFormsApi;

    private readonly queryMatches:RecognizedQueries;

    private readonly queryDomain:string;

    private readonly waitForTile:number|null;

    private readonly waitForTilesTimeoutSecs:number;

    private readonly appServices:IAppServices;

    private readonly backlink:Backlink;

    constructor({dispatcher, initialState, tileId, api, queryMatches, queryDomain, waitForTile,
            waitForTilesTimeoutSecs, appServices, backlink}:WordFormsModelArgs) {
        super(dispatcher, initialState);
        this.tileId = tileId;
        this.api = api;
        this.queryMatches = queryMatches;
        this.queryDomain = queryDomain;
        this.waitForTile = waitForTile;
        this.waitForTilesTimeoutSecs = waitForTilesTimeoutSecs;
        this.appServices = appServices;
        this.backlink = isWebDelegateApi(this.api) ? {...this.api.getBackLink(), ...(backlink || {})} : backlink;

        this.addActionHandler<typeof GlobalActions.EnableAltViewMode>(
            GlobalActions.EnableAltViewMode.name,
            (state, action) => {
                if (action.payload.ident === this.tileId) {
                    state.isAltViewMode = true;
                }
            }
        );

        this.addActionHandler<typeof GlobalActions.DisableAltViewMode>(
            GlobalActions.DisableAltViewMode.name,
            (state, action) => {
                if (action.payload.ident === this.tileId) {
                    state.isAltViewMode = false;
                }
            }
        );

        this.addActionHandler<typeof GlobalActions.RequestQueryResponse>(
            GlobalActions.RequestQueryResponse.name,
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
                        (action, syncData) => {
                            if (ConcActions.isTileDataLoaded(action) && action.payload.tileId === this.waitForTile) {
                                if (action.error) {
                                    console.error(action.error);
                                    dispatch<typeof Actions.TileDataLoaded>({
                                        name: Actions.TileDataLoaded.name,
                                        error: action.error,
                                        payload: {
                                            tileId: this.tileId,
                                            queryId: 0,
                                            isEmpty: true,
                                            data: [],
                                            subqueries: [],
                                            domain1: null,
                                            domain2: null,
                                            backlink: null,
                                        }
                                    });

                                } else {
                                    this.fetchWordForms(
                                        {
                                            corpName: action.payload.corpusName,
                                            subcorpName: action.payload.subcorpusName,
                                            concPersistenceID: action.payload.concPersistenceIDs[0]
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
                            domain: this.queryDomain,
                            lemma: variant.lemma,
                            pos: List.map(v => v.value, variant.pos)
                        },
                        dispatch
                    );
                }

            }
        );

        this.addActionHandler<typeof Actions.TileDataLoaded>(
            Actions.TileDataLoaded.name,
            (state, action) => {
                if (action.payload.tileId === this.tileId) {
                    state.isBusy = false;
                    if (action.error) {
                        state.error = this.appServices.normalizeHttpApiError(action.error);
                        state.backlink = null;

                    } else if (action.payload.data.length === 0) {
                        state.data = [];
                        state.backlink = action.payload.backlink;

                    } else {
                        state.data = filterRareVariants(
                            action.payload.data,
                            state.corpusSize,
                            state.freqFilterAlphaLevel
                        );
                        state.backlink = action.payload.backlink;
                    }
                }
            }
        );

        this.addActionHandler<typeof GlobalActions.GetSourceInfo>(
            GlobalActions.GetSourceInfo.name,
            (state, action) => {},
            (state, action, seDispatch) => {
                if (action.payload['tileId'] === this.tileId) {
                    this.api.getSourceDescription(this.tileId,  this.queryDomain, state.corpname).subscribe(
                        (data) => {
                            seDispatch<typeof GlobalActions.GetSourceInfoDone>({
                                name: GlobalActions.GetSourceInfoDone.name,
                                payload: {
                                    data
                                }
                            });
                        },
                        (error) => {
                            seDispatch<typeof GlobalActions.GetSourceInfoDone>({
                                name: GlobalActions.GetSourceInfoDone.name,
                                error
                            });
                        }
                    );
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
                dispatch<typeof Actions.TileDataLoaded>({
                    name: Actions.TileDataLoaded.name,
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
                        domain1: null,
                        domain2: null,
                        backlink: this.backlink.isAppUrl ? createAppBacklink(this.backlink) : this.api.createBacklink(args, this.backlink),
                    }
                });
            },
            (err) => {
                console.error(err);
                dispatch<typeof Actions.TileDataLoaded>({
                    name: Actions.TileDataLoaded.name,
                    error: err,
                    payload: {
                        tileId: this.tileId,
                        queryId: 0,
                        isEmpty: true,
                        data: [],
                        subqueries: [],
                        domain1: null,
                        domain2: null,
                        backlink: null,
                    }
                });
            }
        );
    }
}
