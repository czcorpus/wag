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
import {ActionName as GlobalActionName} from '../../models/actions';
import {ActionName, Actions} from './actions';
import {RequestBuilder, Line, QuerySelector, RequestArgs} from './api';
import { WdglanceMainFormModel } from '../../models/query';
import { AppServices } from '../../appServices';
import { importMessageType } from '../../notifications';
import { SystemMessageType } from '../../abstract/types';


export interface ConcordanceTileState {
    isBusy:boolean;
    error:string|null;
    isExpanded:boolean;
    lines:Immutable.List<Line>;
    corpname:string;
    fullsize:number;
    concsize:number;
    resultARF:number;
    resultIPM:number;
    kwicLeftCtx:number;
    kwicRightCtx:number;
    pageSize:number;
    currPage:number; // from 1
    loadPage:number; // the one we are going to load
    attr_vmode:'mouseover';
    attrs:Immutable.List<string>;
}


export interface ConcordanceTileModelArgs {
    dispatcher:ActionDispatcher;
    tileId:number;
    appServices:AppServices;
    service:RequestBuilder;
    mainForm:WdglanceMainFormModel;
    initState:ConcordanceTileState;
}


export const stateToArgs = (state:ConcordanceTileState, query:string, querySelector:QuerySelector):RequestArgs => {
    return {
        corpname: state.corpname,
        iquery: query,
        queryselector: querySelector,
        kwicleftctx: state.kwicLeftCtx.toString(),
        kwicrightctx: state.kwicRightCtx.toString(),
        async: '0',
        pagesize: state.pageSize.toString(),
        fromp: state.loadPage.toFixed(0),
        attr_vmode: state.attr_vmode,
        attrs: state.attrs.join(','),
        format:'json'
    };
}


export class ConcordanceTileModel extends StatelessModel<ConcordanceTileState> {

    private readonly service:RequestBuilder;

    private readonly mainForm:WdglanceMainFormModel;

    private readonly appServices:AppServices;

    private readonly tileId:number;

    private static readonly BASIC_KWIC_CTX = 5;

    private static readonly EXPANDED_KWIC_CTX = 10;

    constructor({dispatcher, tileId, appServices, service, mainForm, initState}:ConcordanceTileModelArgs) {
        super(dispatcher, initState);
        this.service = service;
        this.mainForm = mainForm;
        this.appServices = appServices;
        this.tileId = tileId;

        this.actionMatch = {

            [GlobalActionName.RequestQueryResponse]: (state, action) => {
                const newState = this.copyState(state);
                newState.isBusy = true;
                return newState;
            },
            [GlobalActionName.ExpandTile]: (state, action) => {
                if (action.payload['ident'] === this.tileId) {
                    const newState = this.copyState(state);
                    newState.isExpanded = true;
                    newState.kwicLeftCtx = -1 * ConcordanceTileModel.EXPANDED_KWIC_CTX;
                    newState.kwicRightCtx = ConcordanceTileModel.EXPANDED_KWIC_CTX;
                    return newState;
                }
                return state;
            },
            [GlobalActionName.ResetExpandTile]: (state, action) => {
                const newState = this.copyState(state);
                newState.isExpanded = false;
                newState.kwicLeftCtx = -1 * ConcordanceTileModel.BASIC_KWIC_CTX;
                newState.kwicRightCtx = ConcordanceTileModel.BASIC_KWIC_CTX;
                return newState;
            },
            [ActionName.DataLoadDone]: (state, action:Actions.DataLoadDone) => {
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
                    newState.currPage = newState.loadPage;
                }
                return newState;
            },
            [ActionName.LoadNextPage]: (state, action:Actions.LoadNextPage) => {
                const newState = this.copyState(state);
                newState.isBusy = true;
                newState.loadPage = newState.currPage + 1;
                return newState;
            },
            [ActionName.LoadPrevPage]: (state, action:Actions.LoadNextPage) => {
                if (state.currPage - 1 > 0) {
                    const newState = this.copyState(state);
                    newState.isBusy = true;
                    newState.loadPage = newState.currPage - 1;
                    return newState;

                } else {
                    this.appServices.showMessage(SystemMessageType.ERROR, 'Cannot load page < 1');
                }

            }
        };
    }

    sideEffects(state:ConcordanceTileState, action:Action, dispatch:SEDispatcher):void {
        switch(action.name) {
            case GlobalActionName.RequestQueryResponse:
            case GlobalActionName.ExpandTile:
            case GlobalActionName.ResetExpandTile:
            case ActionName.LoadNextPage:
            case ActionName.LoadPrevPage:
                this.service.call(stateToArgs(state, this.mainForm.getState().query.value, QuerySelector.BASIC))
                .subscribe(
                    (data) => {
                        dispatch<Actions.DataLoadDone>({
                            name: ActionName.DataLoadDone,
                            payload: {
                                data: data
                            }
                        });
                    },
                    (err) => {
                        dispatch<Actions.DataLoadDone>({
                            name: ActionName.DataLoadDone,
                            error: err
                        });
                    }
                )
            break;
        }
    }
}