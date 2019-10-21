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

        this.actionMatch = {
            [GlobalActionName.EnableTileTweakMode]: (state, action:GlobalActions.EnableTileTweakMode) => {
                if (action.payload.ident === this.tileId) {
                    const newState = this.copyState(state);
                    newState.isTweakMode = true;
                    return newState;
                }
                return state;
            },
            [GlobalActionName.DisableTileTweakMode]: (state, action:GlobalActions.DisableTileTweakMode) => {
                if (action.payload.ident === this.tileId) {
                    const newState = this.copyState(state);
                    newState.isTweakMode = false;
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
            [GlobalActionName.RequestQueryResponse]: (state, action:GlobalActions.RequestQueryResponse)  => {
                const newState = this.copyState(state);
                newState.isBusy = true;
                newState.error = null;
                return newState;
            },
            [GlobalActionName.TileDataLoaded]: (state, action:GlobalActions.TileDataLoaded<DataLoadedPayload>) => {
                if (action.payload.tileId === this.tileId) {
                    const newState = this.copyState(state);
                    newState.isBusy = false;
                    if (action.error) {
                        newState.data = Immutable.List<WordSimWord>();
                        newState.error = action.error.message;

                    } else {
                        newState.data = Immutable.List<WordSimWord>(action.payload.words);
                    }
                    return newState;
                }
                return state;
            },
            [ActionName.SetOperationMode]: (state, action:Actions.SetOperationMode) => {
                if (action.payload.tileId === this.tileId) {
                    const newState = this.copyState(state);
                    newState.isBusy = true;
                    newState.operationMode = action.payload.value;
                    newState.data = Immutable.List<WordSimWord>();
                    return newState;
                }
                return state;
            }
        }
    }

    sideEffects(state:WordSimModelState, action:Action, seDispatch:SEDispatcher):void {
        switch (action.name) {
            case GlobalActionName.RequestQueryResponse:
            case ActionName.SetOperationMode:
                this.api.call(
                    this.api.stateToArgs(state, findCurrLemmaVariant(this.lemmas.get(0)).lemma)

                ).subscribe(
                    (data) => {
                        seDispatch<Action<DataLoadedPayload>>({
                            name: GlobalActionName.TileDataLoaded,
                            payload: {
                                tileId: this.tileId,
                                words: data.words
                            }
                        });

                    },
                    (err) => {
                        seDispatch<Action<DataLoadedPayload>>({
                            name: GlobalActionName.TileDataLoaded,
                            payload: {
                                tileId: this.tileId,
                                words: []
                            },
                            error: err
                        })
                    }
                );
            break;
            case GlobalActionName.GetSourceInfo:
                if (action.payload['tileId'] === this.tileId) {
                    this.api.getSourceDescription(this.tileId).subscribe(
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
            break;
        }
    }

}