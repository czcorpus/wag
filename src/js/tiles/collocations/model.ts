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
import {ActionName as GlobalActionName, Actions as GlobalActions} from '../../models/actions';
import {ActionName as ConcActionName, Actions as ConcActions} from '../concordance/actions';
import {ActionName, DataRow, Actions, CollApiArgs, DataHeading} from './common';
import { KontextCollAPI } from './service';
import { AppServices } from '../../appServices';
import { SystemMessageType } from '../../abstract/types';


export interface CollocModelArgs {
    dispatcher:ActionDispatcher;
    tileId:number;
    appServices:AppServices;
    service:KontextCollAPI;
    initState:CollocModelState;
    waitForTile:number;
}


export interface CollocModelState {
    isBusy:boolean;
    isExpanded:boolean;
    error:string|null;
    corpname:string;
    q:string;
    cattr:string;
    cfromw:number;
    ctow:number;
    cminfreq:number;
    cminbgr:number;
    cbgrfns:Array<string>;
    csortfn:string;
    data:Immutable.List<DataRow>;
    heading:DataHeading;
    citemsperpage:number;
}


export const stateToArgs = (state:CollocModelState, q:string):CollApiArgs => {
    return {
        corpname: state.corpname,
        q: q ? q : state.q,
        cattr: state.cattr,
        cfromw: state.cfromw,
        ctow: state.ctow,
        cminfreq: state.cminfreq,
        cminbgr: state.cminbgr,
        cbgrfns: state.cbgrfns,
        csortfn: state.csortfn,
        citemsperpage: state.citemsperpage,
        format: 'json'
    };
}


export class CollocModel extends StatelessModel<CollocModelState> {

    private readonly service:KontextCollAPI;

    private readonly appServices:AppServices;

    private readonly tileId:number;

    private readonly waitForTile:number;

    constructor({dispatcher, tileId, waitForTile, appServices, service, initState}:CollocModelArgs) {
        super(dispatcher, initState);
        this.tileId = tileId;
        this.waitForTile = waitForTile;
        this.appServices = appServices;
        this.service = service;
        this.actionMatch = {
            [GlobalActionName.ExpandTile]: (state, action:GlobalActions.ExpandTile) => {
                if (action.payload.ident === this.tileId) {
                    const newState = this.copyState(state);
                    newState.isExpanded = true;
                    return newState;
                }
                return state;
            },
            [GlobalActionName.ResetExpandTile]: (state, action:GlobalActions.ExpandTile) => {
                if (action.payload.ident === this.tileId) {
                    const newState = this.copyState(state);
                    newState.isExpanded = false;
                    return newState;
                }
                return state;
            },
            [GlobalActionName.RequestQueryResponse]: (state, action:GlobalActions.RequestQueryResponse)  => {
                const newState = this.copyState(state);
                newState.isBusy = true;
                return newState;
            },
            [GlobalActionName.ExpandTile]: (state, action:GlobalActions.ExpandTile) => {
                let newState:CollocModelState;
                if (action.payload['ident'] === this.tileId) {
                    newState = this.copyState(state);
                    newState.isExpanded = true;

                } else {
                    newState = state;
                }
                return newState;
            },
            [GlobalActionName.ResetExpandTile]: (state, action:GlobalActions.ResetExpandTile) => {
                let newState:CollocModelState;
                if (action.payload['ident'] === this.tileId) {
                    newState = this.copyState(state);
                    newState.isExpanded = false;

                } else {
                    newState = state;
                }
                return newState;
            },
            [ActionName.DataLoadDone]: (state, action:Actions.DataLoadDone) => {
                const newState = this.copyState(state);
                newState.q = action.payload.q;
                newState.isBusy = false;
                if (action.error) {
                    newState.error = action.error.message;

                } else {
                    newState.data = Immutable.List<DataRow>(action.payload.data);
                    newState.heading = action.payload.heading.map((v, i) => {
                        if (i === 0) {
                            return {n: 'Abs.', s: ''};
                        }
                        return v;
                    });
                }
                return newState;
            }
        }
    }

    sideEffects(state:CollocModelState, action:Action, seDispatch:SEDispatcher):void {
        switch (action.name) {
            case GlobalActionName.RequestQueryResponse:
                this.suspend(
                    (action:Action) => {
                        if (action.name === ConcActionName.DataLoadDone && action.payload['tileId'] === this.waitForTile) {
                            const payload = (action as ConcActions.DataLoadDone).payload;
                            new Rx.Observable((observer:Rx.Observer<CollApiArgs>) => {
                                if (action.error) {
                                    observer.error(action.error);

                                } else {
                                    observer.next(stateToArgs(state, '~' + payload.data.conc_persistence_op_id));
                                    observer.complete();
                                }
                            })
                            .concatMap(args => this.service.call(args))
                            .subscribe(
                                (data) => {
                                    seDispatch({
                                        name: ActionName.DataLoadDone,
                                        payload: {
                                            heading: data.Head,
                                            data: data.Items,
                                            q: '~' + data.conc_persistence_op_id,
                                        }
                                    });
                                },
                                (err) => {
                                    this.appServices.showMessage(SystemMessageType.ERROR, err);
                                    seDispatch({
                                        name: ActionName.DataLoadDone,
                                        payload: {},
                                        error: err
                                    });
                                }
                            );
                            return true;
                        }
                        return false;
                    }
                );
            break;
        }
    }
}