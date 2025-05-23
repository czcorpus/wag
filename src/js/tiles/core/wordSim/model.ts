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

import { Observable, Observer } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import { List, tuple } from 'cnc-tskit';

import { StatelessModel, IActionDispatcher, SEDispatcher } from 'kombo';
import { Actions as GlobalActions } from '../../../models/actions.js';
import { Actions } from './actions.js';
import { QueryMatch, testIsDictMatch } from '../../../query/index.js';
import { callWithExtraVal } from '../../../api/util.js';
import { IAppServices } from '../../../appServices.js';
import { CNCWord2VecSimApi, CNCWord2VecSimApiArgs, OperationMode, WordSimWord } from './api.js';
import { IDataStreaming } from '../../../page/streaming.js';


export interface WordSimModelArgs {
    dispatcher:IActionDispatcher;
    initState:WordSimModelState;
    tileId:number;
    api:CNCWord2VecSimApi;
    appServices:IAppServices;
}


/**
 * WordSimModelState is a state for 'word similarity' core tile (and
 * derived tiles).
 */
export interface WordSimModelState {
    isBusy:boolean;
    isTweakMode:boolean;
    isMobile:boolean;
    isAltViewMode:boolean;
    error:string;
    maxResultItems:number;
    minScore:number;
    minMatchFreq:number;
    data:Array<Array<WordSimWord>>;
    operationMode:OperationMode;
    corpus:string;
    model:string;
    queryMatches:Array<QueryMatch>;
    selectedText:string;
}


export class WordSimModel extends StatelessModel<WordSimModelState> {

    private readonly tileId:number;

    private readonly api:CNCWord2VecSimApi;

    constructor({dispatcher, initState, tileId, api, appServices}:WordSimModelArgs) {
        super(dispatcher, initState);
        this.tileId = tileId;
        this.api = api;

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
                this.getData(state, appServices.dataStreaming(), seDispatch);
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
                        state.data[action.payload.queryIdx] = action.payload.words;

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
                this.getData(
                    state,
                    appServices.dataStreaming().startNewSubgroup(this.tileId),
                    seDispatch
                );
            }
        );
        this.addActionHandler<typeof GlobalActions.GetSourceInfo>(
            GlobalActions.GetSourceInfo.name,
            (state, action) => {},
            (state, action, seDispatch) => {
                if (action.payload['tileId'] === this.tileId) {
                    this.api.getSourceDescription(
                        appServices.dataStreaming().startNewSubgroup(this.tileId),
                        this.tileId,
                        appServices.getISO639UILang(),
                        state.corpus
                    ).subscribe({
                        next:(data) => {
                            seDispatch({
                                name: GlobalActions.GetSourceInfoDone.name,
                                payload: {
                                    tileId: this.tileId,
                                    data: data
                                }
                            });
                        },
                        error: (err) => {
                            seDispatch({
                                name: GlobalActions.GetSourceInfoDone.name,
                                payload: {
                                    tileId: this.tileId,
                                    data: null
                                },
                                error: err
                            });
                        }
                    });
                }
            }
        );
    }

    private stateToArgs(state:WordSimModelState, queryMatch:QueryMatch):CNCWord2VecSimApiArgs {
        return {
            corpus: state.corpus,
            model: state.model,
            word: queryMatch.lemma,
            pos: queryMatch.pos.length > 0 ? queryMatch.pos[0].value[0]: '', // TODO is the first zero OK? (i.e. we ignore other variants)
            limit: state.maxResultItems,
            minScore: state.minScore
        };
    }

    getData(state:WordSimModelState, dataStreaming:IDataStreaming, seDispatch:SEDispatcher):void {
        new Observable((observer:Observer<[number, QueryMatch]>) => {
            state.queryMatches.forEach((queryMatch, queryId) => {
                observer.next(tuple(queryId, queryMatch));
            });
            observer.complete();

        }).pipe(
            mergeMap(([queryId, queryMatch]) =>
                callWithExtraVal(
                    dataStreaming,
                    this.api,
                    this.tileId,
                    queryId,
                    testIsDictMatch(queryMatch) ?
                        this.stateToArgs(state, queryMatch) :
                        null,
                    queryId
                )
            )
        ).subscribe({
            next: ([data, queryId]) => {
                seDispatch<typeof Actions.TileDataLoaded>({
                    name: Actions.TileDataLoaded.name,
                    payload: {
                        tileId: this.tileId,
                        queryIdx: queryId,
                        words: data.words,
                        isEmpty: data.words.length === 0
                    }
                });

            },
            error: (error) => {
                seDispatch<typeof Actions.TileDataLoaded>({
                    name: Actions.TileDataLoaded.name,
                    payload: {
                        tileId: this.tileId,
                        queryIdx: null,
                        words: [],
                        isEmpty: true
                    },
                    error
                })
            }
        });
    }

}