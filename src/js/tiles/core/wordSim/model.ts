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

import { StatelessModel, IActionDispatcher, Action, SEDispatcher } from 'kombo';
import * as Immutable from 'immutable';
import { ActionName as GlobalActionName, Actions as GlobalActions } from '../../../models/actions';
import { DataLoadedPayload } from './actions';
import { ActionName, Actions } from './actions';
import { findCurrLemmaVariant } from '../../../models/query';
import { WordSimApi, WordSimWord } from '../../../common/api/abstract/wordSim';
import { WordSimModelState } from '../../../common/models/wordSim';
import { RecognizedQueries } from '../../../common/query';


export interface WordSimModelArgs {
    dispatcher:IActionDispatcher;
    initState:WordSimModelState;
    tileId:number;
    api:WordSimApi<{}>;
    lemmas:RecognizedQueries;
}


export class WordSimModel extends StatelessModel<WordSimModelState> {

    private readonly tileId:number;

    private readonly api:WordSimApi<{}>;

    private readonly lemmas:RecognizedQueries;

    constructor({dispatcher, initState, tileId, api, lemmas}:WordSimModelArgs) {
        super(dispatcher, initState);
        this.tileId = tileId;
        this.api = api;
        this.lemmas = lemmas;

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
                        state.data = Immutable.List<WordSimWord>();
                        state.error = action.error.message;

                    } else {
                        state.data = Immutable.List<WordSimWord>(action.payload.words);
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
                    state.data = Immutable.List<WordSimWord>();
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
                                    data: data
                                }
                            });
                        },
                        (err) => {
                            seDispatch({
                                name: GlobalActionName.GetSourceInfoDone,
                                payload: {
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
        this.api.call(
            this.api.stateToArgs(state, findCurrLemmaVariant(this.lemmas[0]).lemma)

        ).subscribe(
            (data) => {
                seDispatch<Action<DataLoadedPayload>>({
                    name: GlobalActionName.TileDataLoaded,
                    payload: {
                        tileId: this.tileId,
                        words: data.words,
                        subqueries: data.words.map(v => ({
                            value: {
                                value: v.word,
                                context: [-5, 5] // TODO
                            },
                            interactionId: v.interactionId
                        })),
                        lang1: null,
                        lang2: null
                    }
                });

            },
            (err) => {
                seDispatch<Action<DataLoadedPayload>>({
                    name: GlobalActionName.TileDataLoaded,
                    payload: {
                        tileId: this.tileId,
                        words: [],
                        subqueries: [],
                        lang1: null,
                        lang2: null
                    },
                    error: err
                })
            }
        );
    }

}