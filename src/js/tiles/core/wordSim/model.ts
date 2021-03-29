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
import { ActionName as GlobalActionName, Actions as GlobalActions } from '../../../models/actions';
import { DataLoadedPayload } from './actions';
import { ActionName, Actions } from './actions';
import { IWordSimApi, WordSimWord } from '../../../api/abstract/wordSim';
import { WordSimModelState } from '../../../models/tiles/wordSim';
import { QueryMatch } from '../../../query/index';
import { callWithExtraVal } from '../../../api/util';
import { IAppServices } from '../../../appServices';


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

        this.addActionHandler<GlobalActions.SubqItemHighlighted>(
            GlobalActionName.SubqItemHighlighted,
            (state, action) => {
                state.selectedText = action.payload.text;
            }
        );
        this.addActionHandler<GlobalActions.SubqItemDehighlighted>(
            GlobalActionName.SubqItemDehighlighted,
            (state, action) => {
                state.selectedText = null;
            }
        );
        this.addActionHandler<GlobalActions.EnableTileTweakMode>(
            GlobalActionName.EnableTileTweakMode,
            (state, action) => {
                if (action.payload.ident === this.tileId) {
                    state.isTweakMode = true;
                }
            }
        );
        this.addActionHandler<GlobalActions.DisableTileTweakMode>(
            GlobalActionName.DisableTileTweakMode,
            (state, action) => {
                if (action.payload.ident === this.tileId) {
                    state.isTweakMode = false;
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
        this.addActionHandler<GlobalActions.RequestQueryResponse>(
            GlobalActionName.RequestQueryResponse,
            (state, action) => {
                state.isBusy = true;
                state.error = null;
            },
            (state, action, seDispatch) => {
                this.getData(state, seDispatch);
            }
        );
        this.addActionHandler<GlobalActions.TileDataLoaded<DataLoadedPayload>>(
            GlobalActionName.TileDataLoaded,
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
        this.addActionHandler<Actions.SetOperationMode>(
            ActionName.SetOperationMode,
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
        this.addActionHandler<GlobalActions.GetSourceInfo>(
            GlobalActionName.GetSourceInfo,
            (state, action) => {},
            (state, action, seDispatch) => {
                if (action.payload['tileId'] === this.tileId) {
                    this.api.getSourceDescription(this.tileId, this.queryDomain, state.corpus).subscribe(
                        (data) => {
                            seDispatch({
                                name: GlobalActionName.GetSourceInfoDone,
                                payload: {
                                    tileId: this.tileId,
                                    data: data
                                }
                            });
                        },
                        (err) => {
                            seDispatch({
                                name: GlobalActionName.GetSourceInfoDone,
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
                seDispatch<GlobalActions.TileDataLoaded<DataLoadedPayload>>({
                    name: GlobalActionName.TileDataLoaded,
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
            (err) => {
                seDispatch<GlobalActions.TileDataLoaded<DataLoadedPayload>>({
                    name: GlobalActionName.TileDataLoaded,
                    payload: {
                        tileId: this.tileId,
                        queryId: null,
                        words: [],
                        subqueries: [],
                        domain1: null,
                        domain2: null,
                        isEmpty: true
                    },
                    error: err
                })
            }
        );
    }

}