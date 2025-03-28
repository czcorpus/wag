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
import { StatelessModel, IActionQueue } from 'kombo';

import { IAppServices } from '../../../appServices.js';
import { Actions as GlobalActions } from '../../../models/actions.js';
import { Actions } from './actions.js';
import { RequestArgs, StrippedFreqResponse, SyDAPI } from './api.js';
import { RecognizedQueries } from '../../../query/index.js';
import { List, pipe } from 'cnc-tskit';


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

    private readonly queryMatches:RecognizedQueries;

    private readonly api:SyDAPI;

    private readonly appServices:IAppServices;

    constructor(dispatcher:IActionQueue, initialState:SydModelState, tileId:number, waitForTile:number, queryMatches:RecognizedQueries,
                appServices:IAppServices, api:SyDAPI) {
        super(dispatcher, initialState);
        this.tileId = tileId;
        this.waitForTile = waitForTile;
        this.queryMatches = queryMatches;
        this.api = api;
        this.appServices = appServices;

        this.addActionHandler<typeof GlobalActions.RequestQueryResponse>(
            GlobalActions.RequestQueryResponse.name,
            (state, action) => {
                state.isBusy = true;
                state.procTime = -1;
                state.result = [];
            },
            (state, action, dispatch) => {
                this.api.call(
                    this.tileId,
                    true,
                    stateToArgs(
                        state,
                        this.queryMatches[0][0].word, // TODO !!!
                        pipe(this.queryMatches, List.slice(1), List.map(lvList => lvList[0].word)) // TODO
                    )

                ).subscribe({
                    next: (data) => {
                        dispatch<typeof Actions.TileDataLoaded>({
                            name: Actions.TileDataLoaded.name,
                            payload: {
                                tileId: this.tileId,
                                isEmpty: data.results.length === 0,
                                data: data
                            }
                        });
                    },
                    error: (error) => {
                        dispatch<typeof Actions.TileDataLoaded>({
                            name: Actions.TileDataLoaded.name,
                            error,
                            payload: {
                                tileId: this.tileId,
                                isEmpty: true,
                                data: null
                            }
                        });
                    }
                });
            }
        );

        this.addActionHandler<typeof Actions.TileDataLoaded>(
            Actions.TileDataLoaded.name,
            (state, action) => {
                if (action.payload.tileId === this.tileId) {
                    state.isBusy = false;
                    if (action.error) {
                        state.isBusy = false;
                        state.error = this.appServices.normalizeHttpApiError(action.error);

                    } else {
                        state.isBusy = false;
                        state.result = action.payload.data.results;
                        state.procTime = action.payload.data.procTime;
                    }
                }
            }
        );
    }
}