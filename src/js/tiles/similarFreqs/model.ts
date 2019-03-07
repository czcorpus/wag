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
import {map} from 'rxjs/operators';
import { StatelessModel, IActionDispatcher, Action, SEDispatcher } from 'kombo';
import {ActionName as GlobalActionName, Actions as GlobalActions} from '../../models/actions';
import { SimilarlyFreqWord, SimilarFreqWordsApi, Response } from './api';
import { DataLoadedPayload } from './actions';
import { WdglanceMainFormModel } from '../../models/query';

export interface SimFreqsModelState {
    isBusy:boolean;
    error:string;
    corpname:string;
    corpusSize:number;
    srchRange:number;
    data:Immutable.List<SimilarlyFreqWord>;
}

export class SimFreqsModel extends StatelessModel<SimFreqsModelState> {

    private readonly tileId:number;

    private readonly api:SimilarFreqWordsApi;

    private readonly mainForm:WdglanceMainFormModel;

    constructor(dispatcher:IActionDispatcher, initialState:SimFreqsModelState, tileId:number, api:SimilarFreqWordsApi,
                mainForm:WdglanceMainFormModel) {
        super(dispatcher, initialState);
        this.tileId = tileId;
        this.api = api;
        this.mainForm = mainForm;
        this.actionMatch = {
            [GlobalActionName.RequestQueryResponse]: (state, action:GlobalActions.RequestQueryResponse) => {
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
                        newState.error = action.error.message;

                    } else if (action.payload.data.length === 0) {
                        newState.data = Immutable.List<SimilarlyFreqWord>();

                    } else {
                        newState.data = Immutable.List<SimilarlyFreqWord>(action.payload.data);
                    }
                    return newState;
                }
                return state;
            }
        }
    }


    sideEffects(state:SimFreqsModelState, action:Action, dispatch:SEDispatcher):void {
        switch (action.name) {
            case GlobalActionName.RequestQueryResponse:
                const query = this.mainForm.getState().query.value;
                this.api
                    .call({
                        word: query,
                        srchRange: state.srchRange
                    })
                    .pipe(
                        map<Response, Response>(
                            (data) => ({
                                result: data.result.map(v => ({
                                    word: v.word,
                                    abs: v.abs,
                                    ipm: v.abs / state.corpusSize * 1e6,
                                    highlighted: v.word === query ? true : undefined
                                }))
                            })
                        )
                    ).subscribe(
                        (data) => {
                            dispatch<GlobalActions.TileDataLoaded<DataLoadedPayload>>({
                                name: GlobalActionName.TileDataLoaded,
                                payload: {
                                    tileId: this.tileId,
                                    isEmpty: data.result.length === 0,
                                    data: data.result
                                }
                            });
                        },
                        (error) => {
                            dispatch<GlobalActions.TileDataLoaded<DataLoadedPayload>>({
                                name: GlobalActionName.TileDataLoaded,
                                error: error,
                                payload: {
                                    tileId: this.tileId,
                                    isEmpty: true,
                                    data: []
                                }
                            });
                        }
                    )
            break;
        }

    }
}