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

import { StatelessModel, ActionDispatcher, Action, SEDispatcher } from 'kombo';
import {ActionNames as GlobalActionNames} from '../../models/actions';
import {ActionNames} from './actions';
import {RequestBuilder, ConcResponse, Line} from './service';
import { WdglanceMainFormModel } from '../../models/main';
//import {}



export interface ConcordanceTileState {
    isBusy:boolean;
    lines:Array<Line>;
}

export class ConcordanceTileModel extends StatelessModel<ConcordanceTileState> {

    private readonly service:RequestBuilder;

    private readonly mainForm:WdglanceMainFormModel;

    constructor(dispatcher:ActionDispatcher, service:RequestBuilder, mainForm:WdglanceMainFormModel) {
        super(
            dispatcher,
            {
                isBusy: false,
                lines: []
            }
        );
        this.service = service;
        this.mainForm = mainForm;
    }

    reduce(state:ConcordanceTileState, action:Action):ConcordanceTileState {
        let newState:ConcordanceTileState;
        switch (action.type) {
            case GlobalActionNames.RequestQueryResponse:
                newState = this.copyState(state);
                newState.isBusy = true;
            break;
            case ActionNames.DataLoadDone:
                newState = this.copyState(state);
                newState.isBusy = false;
                const data = action.payload['data'] as ConcResponse;
                newState.lines = data.Lines;
            break;
            default:
                newState = state;
            break;
        }
        return newState;
    }

    sideEffects(state:ConcordanceTileState, action:Action, dispatch:SEDispatcher):void {
        switch(action.type) {
            case GlobalActionNames.RequestQueryResponse:
                this.service.call({query: this.mainForm.getState().query}).subscribe(
                    (data) => {
                        dispatch({
                            type: ActionNames.DataLoadDone,
                            payload: {
                                data: data
                            }
                        });
                    },
                    (err) => {
                        dispatch({
                            type: ActionNames.DataLoadDone,
                            error: err
                        });
                    }
                )
            break;
        }
    }
}