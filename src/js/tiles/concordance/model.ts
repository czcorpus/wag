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
import {ActionName as GlobalActionName, Actions as GlobalActions} from '../../models/actions';
import {ActionName, Actions} from './actions';
import {ConcApi, Line, QuerySelector, RequestArgs, ViewMode} from '../../shared/api/concordance';
import { WdglanceMainFormModel } from '../../models/query';
import { AppServices } from '../../appServices';
import { importMessageType } from '../../notifications';
import { SystemMessageType } from '../../abstract/types';


export interface ConcordanceTileState {
    isBusy:boolean;
    error:string|null;
    isTweakMode:boolean;
    widthFract:number;
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
    viewMode:ViewMode;
    tileId:number;
    attrs:Immutable.List<string>;
}


export interface ConcordanceTileModelArgs {
    dispatcher:ActionDispatcher;
    tileId:number;
    appServices:AppServices;
    service:ConcApi;
    mainForm:WdglanceMainFormModel;
    initState:ConcordanceTileState;
}


export const stateToArgs = (state:ConcordanceTileState, query:string, querySelector:QuerySelector):RequestArgs => {
    return {
        corpname: state.corpname,
        iquery: query,
        queryselector: querySelector,
        kwicleftctx: (-1 * state.kwicLeftCtx).toFixed(),
        kwicrightctx: state.kwicRightCtx.toFixed(),
        async: '0',
        pagesize: state.pageSize.toFixed(),
        fromp: state.loadPage.toFixed(),
        attr_vmode: state.attr_vmode,
        attrs: state.attrs.join(','),
        viewmode: state.viewMode,
        format:'json'
    };
}


export class ConcordanceTileModel extends StatelessModel<ConcordanceTileState> {

    private readonly service:ConcApi;

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
            [GlobalActionName.EnableTileTweakMode]: (state, action:GlobalActions.EnableTileTweakMode) => {
                if (action.payload.ident === this.tileId) {
                    const newState = this.copyState(state);
                    newState.isTweakMode = true;
                    return newState;
                }
                return state;
            },
            [GlobalActionName.DisableTileTweakMode]: (state, action:GlobalActions.DisableTileTweakMode) => {
                if (action.payload.ident === this.tileId) {
                    const newState = this.copyState(state);
                    newState.isTweakMode = false;
                    return newState;
                }
                return state;
            },
            [GlobalActionName.RequestQueryResponse]: (state, action) => {
                const newState = this.copyState(state);
                newState.isBusy = true;
                newState.error = null;
                return newState;
            },
            [ActionName.DataLoadDone]: (state, action:Actions.DataLoadDone) => {
                if (action.payload.tileId === this.tileId) {
                    const newState = this.copyState(state);
                    newState.isBusy = false;
                    if (action.error) {
                        this.appServices.showMessage(SystemMessageType.ERROR, action.error);

                    } else if (action.payload.data.fullsize === 0) {
                        newState.error = this.appServices.translate('global__not_enough_data_to_show_result');

                    } else {
                        // debug:
                        action.payload.data.messages.forEach(msg => console.log(`${importMessageType(msg[0]).toUpperCase()}: conc - ${msg[1]}`));

                        newState.lines = Immutable.List<Line>(action.payload.data.Lines);
                        newState.concsize = action.payload.data.concsize; // TODO fullsize?
                        newState.resultARF = action.payload.data.result_arf;
                        newState.resultIPM = action.payload.data.result_relative_freq;
                        newState.currPage = newState.loadPage;
                    }
                    return newState;
                }
                return state;
            },
            [ActionName.LoadNextPage]: (state, action:Actions.LoadNextPage) => {
                if (action.payload.tileId === this.tileId) {
                    const newState = this.copyState(state);
                    newState.isBusy = true;
                    newState.error = null;
                    newState.loadPage = newState.currPage + 1;
                    return newState;
                }
                return state;
            },
            [ActionName.LoadPrevPage]: (state, action:Actions.LoadNextPage) => {
                if (action.payload.tileId === this.tileId) {
                    if (state.currPage - 1 > 0) {
                        const newState = this.copyState(state);
                        newState.isBusy = true;
                        newState.error = null;
                        newState.loadPage = newState.currPage - 1;
                        return newState;

                    } else {
                        this.appServices.showMessage(SystemMessageType.ERROR, 'Cannot load page < 1');
                    }
                }
                return state;
            },
            [ActionName.SetViewMode]: (state, action:Actions.SetViewMode) => {
                if (action.payload.tileId === this.tileId) {
                    const newState = this.copyState(state);
                    newState.isBusy = true;
                    newState.error = null;
                    newState.viewMode = action.payload.mode;
                    return newState;
                }
                return state;
            }
        };
    }

    private reloadData(state:ConcordanceTileState, dispatch:SEDispatcher):void {
        this.service
            .call(stateToArgs(state, this.mainForm.getState().query.value, QuerySelector.BASIC))
            .subscribe(
                (data) => {
                    dispatch<Actions.DataLoadDone>({
                        name: ActionName.DataLoadDone,
                        payload: {
                            data: data,
                            tileId: this.tileId
                        }
                    });
                },
                (err) => {
                    dispatch<Actions.DataLoadDone>({
                        name: ActionName.DataLoadDone,
                        error: err,
                        payload: {
                            data: null,
                            tileId: this.tileId
                        }
                    });
                }
            );
    }

    sideEffects(state:ConcordanceTileState, action:Action, dispatch:SEDispatcher):void {
        switch(action.name) {
            case GlobalActionName.RequestQueryResponse:
                this.reloadData(state, dispatch);
            break;
            case ActionName.LoadNextPage:
            case ActionName.LoadPrevPage:
            case ActionName.SetViewMode:
                if (action.payload['tileId'] === this.tileId) {
                    this.reloadData(state, dispatch);
                }
            break;
        }
    }
}