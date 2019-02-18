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
import { QueryArgs, MultiBlockFreqDistribAPI } from '../../shared/api/kontextFreqs';
import {ActionName as GlobalActionName, Actions as GlobalActions} from '../../models/actions';
import {ActionName as ConcActionName, Actions as ConcActions} from '../concordance/actions';
import {Actions, ActionName} from './actions';
import { AppServices } from '../../appServices';
import { puid } from '../../shared/util';


export interface FreqPieDataRow {
    name:string;
    percent:number;
}

export interface DataBlock {
    data:Immutable.List<FreqPieDataRow>;
    ident:string;
}

export interface FreqPieModelState {
    isBusy:boolean;
    error:string;
    blocks:Immutable.List<DataBlock>;
    activeBlock:number;
    corpname:string;
    concId:string;
    fcrit:Immutable.List<string>;
    flimit:number;
    freqSort:string;
    fpage:number;
    fttIncludeEmpty:boolean;
}


const stateToAPIArgs = (state:FreqPieModelState, concId:string):QueryArgs => ({
    corpname: state.corpname,
    q: `~${concId ? concId : state.concId}`,
    fcrit: state.fcrit.toArray(),
    flimit: state.flimit.toString(),
    freq_sort: state.freqSort,
    fpage: state.fpage.toString(),
    ftt_include_empty: state.fttIncludeEmpty ? '1' : '0',
    format: 'json'
});


export class FreqPieModel extends StatelessModel<FreqPieModelState> {

    private readonly tileId:number;

    private readonly waitForTile:number;

    private readonly api:MultiBlockFreqDistribAPI;

    private readonly appServices:AppServices;

    constructor(dispatcher:ActionDispatcher, initState:FreqPieModelState, tileId:number, waitForTile:number, appServices:AppServices, api:MultiBlockFreqDistribAPI) {
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
            [ActionName.SetActiveBlock]: (state, action:Actions.SetActiveBlock) => {
                if (action.payload.tileId === this.tileId) {
                    const newState = this.copyState(state);
                    newState.activeBlock = action.payload.idx;
                    return newState;
                }
                return state;
            },
            [ActionName.LoadDataDone]: (state, action:Actions.LoadDataDone) => {
                if (action.payload.tileId === this.tileId) {
                    const newState = this.copyState(state);
                    newState.isBusy = false;
                    if (action.error) {
                        newState.blocks = Immutable.List<DataBlock>(state.fcrit.map(_ => ({
                            data: Immutable.List<FreqPieDataRow>(),
                            ident: puid()
                        })));
                        newState.error = action.error.message;

                    } else if (action.payload.blocks.length === 0) {
                        newState.blocks = Immutable.List<DataBlock>(state.fcrit.map(_ => ({
                            data: Immutable.List<FreqPieDataRow>(),
                            ident: puid()
                        })));
                        newState.error = this.appServices.translate('global__not_enough_data_to_show_result');

                    } else {
                        newState.blocks = Immutable.List<DataBlock>(action.payload.blocks.map(block => {
                            const totalFreq = block.data.reduce((acc, curr) => acc + curr.freq, 0);
                            return {
                                data: Immutable.List<FreqPieDataRow>(block.data.map(v => ({
                                    name: v.name,
                                    percent: v.freq / totalFreq * 100
                                }))),
                                ident: puid()
                            };
                        }));
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
                        if (action.error) {
                            dispatch<Actions.LoadDataDone>({
                                name: ActionName.LoadDataDone,
                                payload: {
                                    blocks: [],
                                    concId: null,
                                    tileId: this.tileId
                                },
                                error: new Error(this.appServices.translate('global__failed_to_obtain_required_data'))
                            });
                            return true;
                        }
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
                                        blocks: resp.blocks,
                                        concId: resp.concId,
                                        tileId: this.tileId
                                    }
                                });
                            },
                            error => {
                                dispatch<Actions.LoadDataDone>({
                                    name: ActionName.LoadDataDone,
                                    payload: {
                                        blocks: null,
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