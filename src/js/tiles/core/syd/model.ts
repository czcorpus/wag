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
import { Action, SEDispatcher, StatelessModel, IActionQueue } from 'kombo';

import { AppServices } from '../../../appServices';
import { ActionName as GlobalActionName, Actions as GlobalActions } from '../../../models/actions';
import { QueryFormModel } from '../../../models/query';
import { DataLoadedPayload } from './actions';
import { RequestArgs, StrippedFreqResponse, SyDAPI } from './api';



export interface SydModelState {
    isBusy:boolean;
    error:string;
    procTime:number;
    corp1:string;
    corp1Fcrit:Immutable.List<string>;
    corp2:string;
    corp2Fcrit:Immutable.List<string>;
    flimit:number;
    freqSort:string;
    fpage:number;
    fttIncludeEmpty:boolean;
    result:Immutable.List<StrippedFreqResponse>;
}

export const stateToArgs = (state:SydModelState, word1:string, word2:string):RequestArgs => {
    return {
        corp1: state.corp1,
        corp2: state.corp2,
        word1: word1,
        word2: word2,
        fcrit1: state.corp1Fcrit.toArray(),
        fcrit2: state.corp2Fcrit.toArray(),
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

    private readonly mainForm:QueryFormModel;

    private readonly api:SyDAPI;

    private readonly appServices:AppServices;

    constructor(dispatcher:IActionQueue, initialState:SydModelState, tileId:number, waitForTile:number, mainForm:QueryFormModel,
                appServices:AppServices, api:SyDAPI) {
        super(dispatcher, initialState);
        this.tileId = tileId;
        this.waitForTile = waitForTile;
        this.mainForm = mainForm;
        this.api = api;
        this.appServices = appServices;
        this.actionMatch = {
            [GlobalActionName.RequestQueryResponse]: (state, action) => {
                const newState = this.copyState(state);
                newState.isBusy = true;
                newState.procTime = -1;
                newState.result = Immutable.List<StrippedFreqResponse>();
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
                        newState.result = Immutable.List<StrippedFreqResponse>(action.payload.data.results);
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
                    this.mainForm.getState().query.value,
                    this.mainForm.getState().query2.value)
                )
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