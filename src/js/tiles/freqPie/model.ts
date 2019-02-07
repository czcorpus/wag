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
import { FreqDistribAPI, QueryArgs } from '../../shared/api/kontextFreqs';
import {ActionName as GlobalActionName, Actions as GlobalActions} from '../../models/actions';
import {ActionName as ConcActionName, Actions as ConcActions} from '../concordance/actions';
import {Actions, ActionName} from './actions';
import { AppServices } from '../../appServices';


export interface FreqPieDataRow {
    name:string;
    percent:number;
}


export interface FreqPieModelState {
    isBusy:boolean;
    error:string;
    data:Immutable.List<FreqPieDataRow>;
    corpname:string;
    concId:string;
    fcrit:string;
    flimit:number;
    freqSort:string;
    fpage:number;
    fttIncludeEmpty:boolean;
}


const stateToAPIArgs = (state:FreqPieModelState, concId:string):QueryArgs => ({
    corpname: state.corpname,
    q: `~${concId ? concId : state.concId}`,
    fcrit: state.fcrit,
    flimit: state.flimit.toString(),
    freq_sort: state.freqSort,
    fpage: state.fpage.toString(),
    ftt_include_empty: state.fttIncludeEmpty ? '1' : '0',
    format: 'json'
});


export class FreqPieModel extends StatelessModel<FreqPieModelState> {

    private readonly tileId:number;

    private readonly waitForTile:number;

    private readonly api:FreqDistribAPI;

    private readonly appServices:AppServices;

    constructor(dispatcher:ActionDispatcher, initState:FreqPieModelState, tileId:number, waitForTile:number, appServices:AppServices, api:FreqDistribAPI) {
        super(dispatcher, initState);
        this.tileId = tileId;
        this.waitForTile = waitForTile;
        this.appServices = appServices;
        this.api = api;
        this.actionMatch = {
            [GlobalActionName.RequestQueryResponse]: (state, action:GlobalActions.RequestQueryResponse) => {
                const newState = this.copyState(state);
                newState.isBusy = true;
                newState.error = null;
                return newState;
            },
            [ActionName.LoadDataDone]: (state, action:Actions.LoadDataDone) => {
                if (action.payload.tileId === this.tileId) {
                    const newState = this.copyState(state);
                    newState.isBusy = false;
                    if (action.error) {
                        newState.data = Immutable.List<FreqPieDataRow>();
                        newState.error = action.error.message;

                    } else if (action.payload.data.length === 0) {
                        newState.data = Immutable.List<FreqPieDataRow>();
                        newState.error = this.appServices.translate('global__not_enough_data_to_show_result');

                    } else {
                        const totalFreq = action.payload.data.reduce((acc, curr) => acc + curr.freq, 0);
                        newState.data = Immutable.List<FreqPieDataRow>(action.payload.data.map(v => ({
                            name: v.name,
                            percent: v.freq / totalFreq * 100
                        })));
                    }
                    return newState;
                }
                return state;
            }
        }
    }

    sideEffects(state:FreqPieModelState, action:Action, dispatch:SEDispatcher):void {
        switch (action.name) {
            case GlobalActionName.RequestQueryResponse:
                this.suspend((action:Action) => {
                    if (action.name === ConcActionName.DataLoadDone && action.payload['tileId'] === this.waitForTile) {
                        const payload = (action as ConcActions.DataLoadDone).payload;
                        new Rx.Observable((observer:Rx.Observer<{}>) => {
                            if (action.error) {
                                observer.error(action.error);

                            } else {
                                observer.next({});
                                observer.complete();
                            }
                        }).concatMap(args => this.api.call(stateToAPIArgs(state, payload.data.conc_persistence_op_id)))
                        .subscribe(
                            resp => {
                                dispatch<Actions.LoadDataDone>({
                                    name: ActionName.LoadDataDone,
                                    payload: {
                                        data: resp.data,
                                        concId: resp.concId,
                                        tileId: this.tileId
                                    }
                                });
                            },
                            error => {
                                dispatch<Actions.LoadDataDone>({
                                    name: ActionName.LoadDataDone,
                                    payload: {
                                        data: null,
                                        concId: null,
                                        tileId: this.tileId
                                    },
                                    error: error
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