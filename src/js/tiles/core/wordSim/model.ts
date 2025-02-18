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

import { Observable, Observer, of as rxOf } from 'rxjs';
import { mergeMap, tap } from 'rxjs/operators';
import { List, tuple } from 'cnc-tskit';

import { StatelessModel, IActionDispatcher, SEDispatcher } from 'kombo';
import { Actions as GlobalActions } from '../../../models/actions.js';
import { Actions } from './actions.js';
import { IWordSimApi, WordSimWord } from '../../../api/abstract/wordSim.js';
import { WordSimModelState } from '../../../models/tiles/wordSim.js';
import { QueryMatch } from '../../../query/index.js';
import { callWithExtraVal } from '../../../api/util.js';
import { IAppServices } from '../../../appServices.js';


export interface WordSimModelArgs {
    dispatcher:IActionDispatcher;
    initState:WordSimModelState;
    tileId:number;
    api:IWordSimApi<{}>;
    queryDomain:string;
    appServices:IAppServices;
}


export class WordSimModel extends StatelessModel<WordSimModelState> {

    private readonly tileId:number;

    private readonly api:IWordSimApi<{}>;

    private readonly queryDomain:string;

    constructor({dispatcher, initState, tileId, api, queryDomain, appServices}:WordSimModelArgs) {
        super(dispatcher, initState);
        this.tileId = tileId;
        this.api = api;
        this.queryDomain = queryDomain;

        this.addActionHandler<typeof GlobalActions.SubqItemHighlighted>(
            GlobalActions.SubqItemHighlighted.name,
            (state, action) => {
                state.selectedText = action.payload.text;
            }
        );
        this.addActionHandler<typeof GlobalActions.SubqItemDehighlighted>(
            GlobalActions.SubqItemDehighlighted.name,
            (state, action) => {
                state.selectedText = null;
            }
        );
        this.addActionHandler<typeof GlobalActions.EnableTileTweakMode>(
            GlobalActions.EnableTileTweakMode.name,
            (state, action) => {
                if (action.payload.ident === this.tileId) {
                    state.isTweakMode = true;
                }
            }
        );
        this.addActionHandler<typeof GlobalActions.DisableTileTweakMode>(
            GlobalActions.DisableTileTweakMode.name,
            (state, action) => {
                if (action.payload.ident === this.tileId) {
                    state.isTweakMode = false;
                }
            }
        );
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
            },
            (state, action, seDispatch) => {
                this.getData(state, seDispatch);
            }
        );
        this.addActionHandler<typeof Actions.TileDataLoaded>(
            GlobalActions.TileDataLoaded.name,
            (state, action) => {
                if (action.payload.tileId === this.tileId) {
                    state.isBusy = false;
                    if (action.error) {
                        state.data = List.map(_ => [], state.queryMatches);
                        state.error = appServices.normalizeHttpApiError(action.error);

                    } else {
                        state.data[action.payload.queryId] = action.payload.words;

                    }
                }
            }
        );
        this.addActionHandler<typeof Actions.SetOperationMode>(
            Actions.SetOperationMode.name,
            (state, action) => {
                if (action.payload.tileId === this.tileId) {
                    state.isBusy = true;
                    state.operationMode = action.payload.value;
                    state.data = state.queryMatches.map(_ => []);
                }
            },
            (state, action, seDispatch) => {
                this.getData(state, seDispatch);
            }
        );
        this.addActionHandler<typeof GlobalActions.GetSourceInfo>(
            GlobalActions.GetSourceInfo.name,
            (state, action) => {},
            (state, action, seDispatch) => {
                if (action.payload['tileId'] === this.tileId) {
                    this.api.getSourceDescription(this.tileId, this.queryDomain, state.corpus).subscribe(
                        (data) => {
                            seDispatch({
                                name: GlobalActions.GetSourceInfoDone.name,
                                payload: {
                                    tileId: this.tileId,
                                    data: data
                                }
                            });
                        },
                        (err) => {
                            seDispatch({
                                name: GlobalActions.GetSourceInfoDone.name,
                                payload: {
                                    tileId: this.tileId,
                                    data: null
                                },
                                error: err
                            });
                        }
                    );
                }
            }
        );
    }

    getData(state:WordSimModelState, seDispatch:SEDispatcher):void {
        new Observable((observer:Observer<[number, QueryMatch]>) => {
            state.queryMatches.forEach((queryMatch, queryId) => {
                observer.next(tuple(queryId, queryMatch));
            });
            observer.complete();

        }).pipe(
            mergeMap(([queryId, queryMatch]) => queryMatch.abs >= state.minMatchFreq ?
                callWithExtraVal(
                    this.api,
                    this.api.stateToArgs(state, queryMatch),
                    queryId
                ) :
                rxOf(tuple({words: [] as Array<WordSimWord>}, queryId))
            )
        ).subscribe(
            ([data, queryId]) => {
                seDispatch<typeof Actions.TileDataLoaded>({
                    name: Actions.TileDataLoaded.name,
                    payload: {
                        tileId: this.tileId,
                        queryId: queryId,
                        words: data.words,
                        subqueries: List.map(
                            v => ({
                                value: {
                                    value: v.word,
                                    context: [-5, 5] // TODO
                                },
                                interactionId: v.interactionId
                            }),
                            data.words
                        ),
                        domain1: null,
                        domain2: null,
                        isEmpty: data.words.length === 0
                    }
                });

            },
            (error) => {
                seDispatch<typeof Actions.TileDataLoaded>({
                    name: Actions.TileDataLoaded.name,
                    payload: {
                        tileId: this.tileId,
                        queryId: null,
                        words: [],
                        subqueries: [],
                        domain1: null,
                        domain2: null,
                        isEmpty: true
                    },
                    error
                })
            }
        );
    }

}