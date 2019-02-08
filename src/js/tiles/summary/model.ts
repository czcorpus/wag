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
import * as Rx from '@reactivex/rxjs';
import { StatelessModel, ActionDispatcher, Action, SEDispatcher } from 'kombo';
import { LemmaFreqApi, RequestArgs, SummaryDataRow } from './api';
import {ActionName as GlobalActionName, Actions as GlobalActions} from '../../models/actions';
import {ActionName as ConcActionName, Actions as ConcActions} from '../concordance/actions';
import { ActionName, Actions } from './actions';
import { AppServices } from '../../appServices';


export interface SummaryModelState {
    isBusy:boolean;
    error:string;
    corpname:string;
    concId:string;
    fcrit:string;
    flimit:number;
    fpage:number;
    freqSort:string;
    includeEmpty:boolean;
    data:Immutable.List<SummaryDataRow>;
}

const stateToAPIArgs = (state:SummaryModelState, concId:string):RequestArgs => ({
    corpname: state.corpname,
    q: `~${concId ? concId : state.concId}`,
    fcrit: state.fcrit,
    flimit: state.flimit.toFixed(),
    freq_sort: state.freqSort,
    fpage: state.fpage.toFixed(),
    ftt_include_empty: state.includeEmpty ? '1' : '0',
    format: 'json'
});

export class SummaryModel extends StatelessModel<SummaryModelState> {

    private readonly api:LemmaFreqApi;

    private readonly waitForTile:number;

    private readonly appServices:AppServices;

    constructor(dispatcher:ActionDispatcher, initialState:SummaryModelState, api:LemmaFreqApi, waitForTile:number,
                    appServices:AppServices) {
        super(dispatcher, initialState);
        this.api = api;
        this.waitForTile = waitForTile;
        this.appServices = appServices;
        this.actionMatch = {
            [GlobalActionName.RequestQueryResponse]: (state, action:GlobalActions.RequestQueryResponse) => {
                const newState = this.copyState(state);
                newState.isBusy = true;
                newState.error = null;
                return newState;
            },
            [ActionName.LoadDataDone]: (state, action:Actions.LoadDataDone) => {
                const newState = this.copyState(state);
                newState.isBusy = false;
                if (action.error) {
                    newState.error = action.error.toString();

                } else if (action.payload.data.length === 0) {
                    newState.data = Immutable.List<SummaryDataRow>();
                    newState.error = this.appServices.translate('global__not_enough_data_to_show_result');

                } else {
                    newState.data = Immutable.List<SummaryDataRow>(action.payload.data);
                }

                return newState;
            }
        }
    }

    sideEffects(state:SummaryModelState, action:Action, dispatch:SEDispatcher):void {
        switch (action.name) {
            case GlobalActionName.RequestQueryResponse:
                this.suspend((action:Action) => {
                    if (action.name === ConcActionName.DataLoadDone && action.payload['tileId'] === this.waitForTile) {
                        const payload = (action as ConcActions.DataLoadDone).payload;
                        this.api.call(stateToAPIArgs(state, payload.data.conc_persistence_op_id)).subscribe(
                            (data) => {
                                dispatch<Actions.LoadDataDone>({
                                    name: ActionName.LoadDataDone,
                                    payload: {
                                        data: data.data,
                                        concId: data.concId
                                    }
                                });
                            },
                            (err) => {
                                console.log(err);
                                dispatch<Actions.LoadDataDone>({
                                    name: ActionName.LoadDataDone,
                                    error: err,
                                    payload: {
                                        data: [], // TODO
                                        concId: null // TODO
                                    }
                                });
                            }
                        );
                        return true;
                    }
                    return false;
                });
            break;
        }
    }
}