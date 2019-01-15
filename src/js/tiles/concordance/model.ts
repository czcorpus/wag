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
import { StatelessModel, ActionDispatcher, Action, SEDispatcher } from 'kombo';
import {ActionNames as GlobalActionNames} from '../../models/actions';
import {ActionNames, Actions} from './actions';
import {RequestBuilder, ConcResponse, Line, QuerySelectors} from './service';
import { WdglanceMainFormModel } from '../../models/query';
import { AppServices } from '../../appServices';
import { SystemMessageType, importMessageType } from '../../notifications';


export interface ConcordanceTileState {
    isBusy:boolean;
    isExpanded:boolean;
    lines:Immutable.List<Line>;
    corpname:string;
    fullsize:number;
    concsize:number;
    resultARF:number;
    resultIPM:number;
}

export class ConcordanceTileModel extends StatelessModel<ConcordanceTileState> {

    private readonly service:RequestBuilder;

    private readonly mainForm:WdglanceMainFormModel;

    private readonly appServices:AppServices;

    private readonly tileId:number;

    constructor(dispatcher:ActionDispatcher, tileId:number, appServices:AppServices, service:RequestBuilder, mainForm:WdglanceMainFormModel) {
        super(
            dispatcher,
            {
                isBusy: false,
                isExpanded: false,
                lines: Immutable.List<Line>(),
                corpname: 'susanne', // TODO
                fullsize: -1,
                concsize: -1,
                resultARF: -1,
                resultIPM: -1
            }
        );
        this.service = service;
        this.mainForm = mainForm;
        this.appServices = appServices;
        this.tileId = tileId;
    }

    reduce(state:ConcordanceTileState, action:Action):ConcordanceTileState {
        let newState:ConcordanceTileState;
        switch (action.name) {
            case GlobalActionNames.RequestQueryResponse:
                newState = this.copyState(state);
                newState.isBusy = true;
            break;
            case GlobalActionNames.ExpandTile:
                if (action.payload['ident'] === this.tileId) {
                    newState = this.copyState(state);
                    newState.isExpanded = true;

                } else {
                    newState = state;
                }
            break;
            case GlobalActionNames.ResetExpandTile:
                newState = this.copyState(state);
                newState.isExpanded = false;
            break;
            case ActionNames.DataLoadDone:
                if (action.error) {
                    this.appServices.showMessage(SystemMessageType.ERROR, action.error);

                } else {
                    newState = this.copyState(state);
                    newState.isBusy = false;
                    const data = action.payload['data'] as ConcResponse;
                    data.messages.forEach(msg => this.appServices.showMessage(importMessageType(msg[0]), msg[1]));
                    newState.lines = Immutable.List<Line>(data.Lines);
                    newState.concsize = data.concsize; // TODO fullsize?
                    newState.resultARF = data.result_arf;
                    newState.resultIPM = data.result_relative_freq;
                }
            break;
            default:
                newState = state;
            break;
        }
        return newState;
    }

    sideEffects(state:ConcordanceTileState, action:Action, dispatch:SEDispatcher):void {
        switch(action.name) {
            case GlobalActionNames.RequestQueryResponse:
                this.service.call(
                    {
                        corpname: state.corpname,
                        queryselector: QuerySelectors.BASIC,
                        query: this.mainForm.getState().query.value
                    }
                ).subscribe(
                    (data) => {
                        dispatch<Actions.DataLoadDone>({
                            name: ActionNames.DataLoadDone,
                            payload: {
                                data: data
                            }
                        });
                    },
                    (err) => {
                        dispatch<Actions.DataLoadDone>({
                            name: ActionNames.DataLoadDone,
                            error: err
                        });
                    }
                )
            break;
        }
    }
}