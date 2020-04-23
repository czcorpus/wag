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

import { StatelessModel, IActionDispatcher, SEDispatcher } from 'kombo';
import { ActionName as GlobalActionName, Actions as GlobalActions } from '../../../models/actions';
import { DataLoadedPayload } from './actions';
import { ActionName, Actions } from './actions';
import { IWordSimApi } from '../../../common/api/abstract/wordSim';
import { WordSimModelState } from '../../../common/models/wordSim';
import { QueryMatch } from '../../../common/query';
import { Observable, Observer } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import { callWithExtraVal } from '../../../common/api/util';
import { List } from 'cnc-tskit';


export interface WordSimModelArgs {
    dispatcher:IActionDispatcher;
    initState:WordSimModelState;
    tileId:number;
    api:IWordSimApi<{}>;
}


export class WordSimModel extends StatelessModel<WordSimModelState> {

    private readonly tileId:number;

    private readonly api:IWordSimApi<{}>;

    constructor({dispatcher, initState, tileId, api}:WordSimModelArgs) {
        super(dispatcher, initState);
        this.tileId = tileId;
        this.api = api;

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
                        state.data = List.map(_ => null, state.queryMatches);
                        state.error = action.error.message;

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
                    state.data = state.queryMatches.map(_ => null);
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
                    this.api.getSourceDescription(this.tileId, state.corpus).subscribe(
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
        new Observable((observer:Observer<{queryId:number; lemma:QueryMatch}>) => {
            state.queryMatches.forEach((lemma, queryId) => {
                observer.next({queryId: queryId, lemma: lemma});
            });
            observer.complete();
        }).pipe(
            mergeMap(args =>
                callWithExtraVal(
                    this.api,
                    this.api.stateToArgs(state, args.lemma),
                    args
                )
            )
        ).subscribe(
            ([data, args]) => {
                seDispatch<GlobalActions.TileDataLoaded<DataLoadedPayload>>({
                    name: GlobalActionName.TileDataLoaded,
                    payload: {
                        tileId: this.tileId,
                        queryId: args.queryId,
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
                        lang1: null,
                        lang2: null,
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
                        lang1: null,
                        lang2: null,
                        isEmpty: true
                    },
                    error: err
                })
            }
        );
    }

}