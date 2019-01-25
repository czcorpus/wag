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
import { StatelessModel, Action, SEDispatcher, ActionDispatcher } from 'kombo';
import {ActionName as GlobalActionName, Actions as GlobalActions} from '../../models/actions';
import { TreqAPI, TreqTranslation, RequestArgs } from './api';
import { ActionName, Actions } from './actions';
import { WdglanceMainFormModel } from '../../models/query';


export interface TreqModelState {
    isBusy:boolean;
    error:string;
    renderFrameSize:[number, number];
    lang1:string;
    lang2:string;
    searchPackages:Immutable.List<string>;
    translations:Immutable.List<TreqTranslation>;
    sum:number;
}


const stateToAPIArgs = (state:TreqModelState, query:string):RequestArgs => {
    return {
        left: state.lang1,
        right: state.lang2,
        viceslovne: '0',
        regularni: '0',
        lemma: '1',
        aJeA: '1',
        hledejKde: state.searchPackages.join(','),
        hledejCo: query,
        order: 'percDesc',
        api: 'true'
    };
};


export class TreqModel extends StatelessModel<TreqModelState> {

    private readonly api:TreqAPI;

    private readonly mainForm:WdglanceMainFormModel;

    constructor(dispatcher:ActionDispatcher, initialState:TreqModelState, api:TreqAPI, mainForm:WdglanceMainFormModel) {
        super(dispatcher, initialState);
        this.api = api;
        this.mainForm = mainForm;
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
                    newState.translations = Immutable.List<TreqTranslation>();
                    newState.error = action.error.message;

                } else {
                    newState.translations = Immutable.List<TreqTranslation>(action.payload.data.lines);
                    newState.sum = action.payload.data.sum;
                    newState.renderFrameSize = action.payload.frameSize;
                }
                return newState;
            }
        }
    }

    sideEffects(state:TreqModelState, action:Action, dispatch:SEDispatcher):void {
        switch (action.name) {
            case GlobalActionName.RequestQueryResponse:
                this.api.call(stateToAPIArgs(state, this.mainForm.getState().query.value)).subscribe(
                    (data) => {
                        dispatch<Actions.LoadDataDone>({
                            name: ActionName.LoadDataDone,
                            payload: {
                                data: data,
                                frameSize: [state.renderFrameSize[0], data.lines.length * 30]
                            }
                        });
                    },
                    (error) => {
                        dispatch<Actions.LoadDataDone>({
                            name: ActionName.LoadDataDone,
                            payload: {
                                data: {lines: [], sum: -1},
                                frameSize: state.renderFrameSize
                            },
                            error: error
                        });
                    }
                );
            break;
        }
    }
}