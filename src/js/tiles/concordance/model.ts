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
import {RequestBuilder, Line, QuerySelectors} from './api';
import { WdglanceMainFormModel } from '../../models/query';
import { AppServices } from '../../appServices';
import { importMessageType } from '../../notifications';
import { SystemMessageType } from '../../abstract/types';


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


export interface ConcordanceTileModelArgs {
    dispatcher:ActionDispatcher;
    tileId:number;
    appServices:AppServices;
    service:RequestBuilder;
    mainForm:WdglanceMainFormModel;
    initState:ConcordanceTileState;
}


export class ConcordanceTileModel extends StatelessModel<ConcordanceTileState> {

    private readonly service:RequestBuilder;

    private readonly mainForm:WdglanceMainFormModel;

    private readonly appServices:AppServices;

    private readonly tileId:number;

    constructor({dispatcher, tileId, appServices, service, mainForm, initState}:ConcordanceTileModelArgs) {
        super(dispatcher, initState);
        this.service = service;
        this.mainForm = mainForm;
        this.appServices = appServices;
        this.tileId = tileId;

        this.actionMatch = {

            [GlobalActionNames.RequestQueryResponse]: (state, action) => {
                const newState = this.copyState(state);
                newState.isBusy = true;
                return newState;
            },
            [GlobalActionNames.ExpandTile]: (state, action) => {
                if (action.payload['ident'] === this.tileId) {
                    const newState = this.copyState(state);
                    newState.isExpanded = true;
                    return newState;
                }
                return state;
            },
            [GlobalActionNames.ResetExpandTile]: (state, action) => {
                const newState = this.copyState(state);
                newState.isExpanded = false;
                return newState;
            },
            [ActionNames.DataLoadDone]: (state, action:Actions.DataLoadDone) => {
                const newState = this.copyState(state);
                if (action.error) {
                    newState.isBusy = false;
                    this.appServices.showMessage(SystemMessageType.ERROR, action.error);

                } else {
                    newState.isBusy = false;
                    action.payload.data.messages.forEach(msg => this.appServices.showMessage(importMessageType(msg[0]), msg[1]));
                    newState.lines = Immutable.List<Line>(action.payload.data.Lines);
                    newState.concsize = action.payload.data.concsize; // TODO fullsize?
                    newState.resultARF = action.payload.data.result_arf;
                    newState.resultIPM = action.payload.data.result_relative_freq;
                }
                return newState;
            }
        };
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