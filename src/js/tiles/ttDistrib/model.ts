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
import {DummyAPI, DataRow} from './api';
import {StatelessModel, ActionDispatcher, Action, IReducer, SEDispatcher} from 'kombo';
import {ActionNames as GlobalActionNames, Actions as GlobalActions} from '../../models/actions';
import {ActionNames, Actions} from './actions';
import { WdglanceTilesModel } from '../../models/tiles';


export interface Window1Conf {
}

export interface TTDistribModelState {
    isBusy:boolean;
    data:Immutable.List<DataRow>;
    renderFrameSize:[number, number];
}

export class TTDistribModel extends StatelessModel<TTDistribModelState> {

    private api:DummyAPI;

    private conf:Window1Conf;

    private actionMatch:{[actionName:string]:IReducer<TTDistribModelState, Action>};

    private tilesModel:WdglanceTilesModel;

    private readonly tileId:number;

    constructor(dispatcher:ActionDispatcher, tileId:number, api:DummyAPI, tilesModel:WdglanceTilesModel, conf:Window1Conf) {
        super(
            dispatcher,
            {
                isBusy: false,
                data: Immutable.List<DataRow>(),
                renderFrameSize:[0, 0]
            }
        );
        this.tileId = tileId;
        this.api = api;
        this.tilesModel = tilesModel;
        this.conf = conf;
        this.actionMatch = {
            [GlobalActionNames.RequestQueryResponse]: (state, action:GlobalActions.RequestQueryResponse) => {
                const newState = this.copyState(state);
                newState.isBusy = true;
                return newState;
            },
            [ActionNames.LoadDataDone]: (state, action:Actions.LoadDataDone) => {
                const newState = this.copyState(state);
                newState.data = Immutable.List<DataRow>(action.payload.data);
                newState.renderFrameSize = action.payload.frameSize;
                newState.isBusy = false;
                return newState;
            }
        }
    }

    reduce(state:TTDistribModelState, action:Action):TTDistribModelState {
        return action.name in this.actionMatch ? this.actionMatch[action.name](state, action) : state;
    }

    sideEffects(state:TTDistribModelState, action:Action, dispatch:SEDispatcher):void {
        switch (action.name) {
            case GlobalActionNames.RequestQueryResponse:
                this.api.call({}).subscribe(
                    data => {
                        dispatch<Actions.LoadDataDone>({
                            name: ActionNames.LoadDataDone,
                            payload: {
                                data: data,
                                frameSize: this.tilesModel.getFrameSize(this.tileId)
                            }
                        });
                    },
                    error => {
                        console.log('error: ', error);
                        dispatch<Actions.LoadDataDone>({
                            name: ActionNames.LoadDataDone,
                            payload: {
                                data: null,
                                frameSize: this.tilesModel.getFrameSize(this.tileId)
                            },
                            error: error
                        });
                    }
                );
            break;
        }
    }

}
