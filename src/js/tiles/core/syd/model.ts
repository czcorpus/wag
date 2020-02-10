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
import { Action, SEDispatcher, StatelessModel, IActionQueue } from 'kombo';

import { AppServices } from '../../../appServices';
import { ActionName as GlobalActionName, Actions as GlobalActions } from '../../../models/actions';
import { DataLoadedPayload } from './actions';
import { RequestArgs, StrippedFreqResponse, SyDAPI } from './api';
import { RecognizedQueries } from '../../../common/query';
import { List, pipe } from '../../../common/collections';



export interface SydModelState {
    isBusy:boolean;
    error:string;
    procTime:number;
    corp1:string;
    corp1Fcrit:Array<string>;
    corp2:string;
    corp2Fcrit:Array<string>;
    flimit:number;
    freqSort:string;
    fpage:number;
    fttIncludeEmpty:boolean;
    result:Array<StrippedFreqResponse>;
}

export const stateToArgs = (state:SydModelState, word:string, otherWords:Array<string>):RequestArgs => {
    return {
        corp1: state.corp1,
        corp2: state.corp2,
        word1: word,
        word2: otherWords[0], // TODO support for N words
        fcrit1: state.corp1Fcrit,
        fcrit2: state.corp2Fcrit,
        flimit: state.flimit.toFixed(),
        freq_sort: state.freqSort,
        fpage: state.fpage.toFixed(),
        ftt_include_empty: state.fttIncludeEmpty ? '1' : '0',
        format: 'json'
    };
}

export class SydModel extends StatelessModel<SydModelState> {

    private readonly tileId:number;

    private readonly waitForTile:number;

    private readonly lemmas:RecognizedQueries;

    private readonly api:SyDAPI;

    private readonly appServices:AppServices;

    constructor(dispatcher:IActionQueue, initialState:SydModelState, tileId:number, waitForTile:number, lemmas:RecognizedQueries,
                appServices:AppServices, api:SyDAPI) {
        super(dispatcher, initialState);
        this.tileId = tileId;
        this.waitForTile = waitForTile;
        this.lemmas = lemmas;
        this.api = api;
        this.appServices = appServices;
        this.actionMatch = {
            [GlobalActionName.RequestQueryResponse]: (state, action) => {
                const newState = this.copyState(state);
                newState.isBusy = true;
                newState.procTime = -1;
                newState.result = [];
                return newState;
            },
            [GlobalActionName.TileDataLoaded]: (state, action:GlobalActions.TileDataLoaded<DataLoadedPayload>) => {
                if (action.payload.tileId === this.tileId) {
                    const newState = this.copyState(state);
                    newState.isBusy = false;
                    if (action.error) {
                        newState.isBusy = false;
                        newState.error = action.error.message;

                    } else {
                        newState.isBusy = false;
                        newState.result = action.payload.data.results;
                        newState.procTime = action.payload.data.procTime;
                    }
                    return newState;
                }
                return state;
            }
        };
    }

    sideEffects(state:SydModelState, action:Action, seDispatch:SEDispatcher):void {
        switch (action.name) {
            case GlobalActionName.RequestQueryResponse:
                this.api.call(stateToArgs(
                    state,
                    this.lemmas[0][0].word, // TODO !!!
                    pipe(this.lemmas, List.slice(1), List.map(lvList => lvList[0].word)) // TODO
                ))
            .subscribe(
                (data) => {
                    seDispatch<GlobalActions.TileDataLoaded<DataLoadedPayload>>({
                        name: GlobalActionName.TileDataLoaded,
                        payload: {
                            tileId: this.tileId,
                            isEmpty: data.results.length === 0,
                            data: data
                        }
                    });
                },
                (err) => {
                    seDispatch<GlobalActions.TileDataLoaded<DataLoadedPayload>>({
                        name: GlobalActionName.TileDataLoaded,
                        error: err,
                        payload: {
                            tileId: this.tileId,
                            isEmpty: true,
                            data: null
                        }
                    });
                }
            );
            break;
        }
    }
}