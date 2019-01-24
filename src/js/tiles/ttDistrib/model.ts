/*
 * Copyright 2018 Tomas Machalek <tomas.machalek@gmail.com>
 * Copyright 2018 Institute of the Czech National Corpus,
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
import {QueryArgs, TTDistribAPI, DataRow} from './api';
import {StatelessModel, ActionDispatcher, Action, SEDispatcher} from 'kombo';
import {ActionName as GlobalActionName, Actions as GlobalActions} from '../../models/actions';
import {ActionName as ConcActionName, Actions as ConcActions} from '../concordance/actions';
import {ActionName, Actions} from './actions';
import { WdglanceTilesModel } from '../../models/tiles';



export interface TTDistribModel {
}

export interface TTDistribModelState {
    isBusy:boolean;
    error:string;
    data:Immutable.List<DataRow>;
    renderFrameSize:[number, number];
    corpname:string;
    q:string;
    fcrit:string;
    flimit:number;
    freqSort:string;
    fpage:number;
    fttIncludeEmpty:boolean;
}


const stateToAPIArgs = (state:TTDistribModelState, queryId:string):QueryArgs => ({
    corpname: state.corpname,
    q: queryId ? queryId : state.q,
    fcrit: state.fcrit,
    flimit: state.flimit.toString(),
    freq_sort: state.freqSort,
    fpage: state.fpage.toString(),
    ftt_include_empty: state.fttIncludeEmpty ? '1' : '0',
    format: 'json'
});


export class TTDistribModel extends StatelessModel<TTDistribModelState> {

    private api:TTDistribAPI;

    private tilesModel:WdglanceTilesModel;

    private readonly tileId:number;

    constructor(dispatcher:ActionDispatcher, tileId:number, api:TTDistribAPI, tilesModel:WdglanceTilesModel, initState:TTDistribModelState) {
        super(dispatcher, initState);
        this.tileId = tileId;
        this.api = api;
        this.tilesModel = tilesModel;
        this.actionMatch = {
            [GlobalActionName.RequestQueryResponse]: (state, action:GlobalActions.RequestQueryResponse) => {
                const newState = this.copyState(state);
                newState.isBusy = true;
                return newState;
            },
            [ActionName.LoadDataDone]: (state, action:Actions.LoadDataDone) => {
                const newState = this.copyState(state);
                newState.isBusy = false;
                if (action.error) {
                    newState.data = Immutable.List<DataRow>();
                    newState.error = action.error.message;

                } else {
                    newState.data = Immutable.List<DataRow>(action.payload.data);
                    newState.renderFrameSize = action.payload.frameSize;
                }
                return newState;
            }
        }
    }

    sideEffects(state:TTDistribModelState, action:Action, dispatch:SEDispatcher):void {
        switch (action.name) {
            case GlobalActionName.RequestQueryResponse:
                this.suspend((action:Action) => {
                    if (action.name === ConcActionName.DataLoadDone) {
                        const payload = (action as ConcActions.DataLoadDone).payload;
                        new Rx.Observable((observer:Rx.Observer<{}>) => {
                            if (action.error) {
                                observer.error(action.error);

                            } else {
                                observer.next({});
                                observer.complete();
                            }
                        }).concatMap(args => this.api.call(stateToAPIArgs(state, '~' + payload.data.conc_persistence_op_id)))
                        .subscribe(
                            resp => {
                                const currFrameSize = this.tilesModel.getFrameSize(this.tileId);
                                dispatch<Actions.LoadDataDone>({
                                    name: ActionName.LoadDataDone,
                                    payload: {
                                        data: resp.data,
                                        q: resp.q,
                                        frameSize: [currFrameSize[0], resp.data.length * 50]
                                    }
                                });
                            },
                            error => {
                                dispatch<Actions.LoadDataDone>({
                                    name: ActionName.LoadDataDone,
                                    payload: {
                                        data: null,
                                        q: null,
                                        frameSize: this.tilesModel.getFrameSize(this.tileId)
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
