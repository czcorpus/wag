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
import { StatelessModel, ActionDispatcher, Action, SEDispatcher } from "kombo";
import {ActionNames as GlobalActionNames, Actions as GlobalActions} from '../../models/actions';
import {ActionNames as ConcActionNames, Actions as ConcActions} from '../concordance/actions';
import {ActionNames, stateToArgs, DataRow, Actions} from './common';
import { KontextCollAPI } from './service';
import { CollocModelState } from "./common";
import { AppServices } from '../../appServices';
import { SystemMessageType } from '../../notifications';
import { WdglanceTilesModel } from '../../models/tiles';


export class CollocModel extends StatelessModel<CollocModelState> {

    private readonly service:KontextCollAPI;

    private readonly appServices:AppServices;

    private readonly tilesModel:WdglanceTilesModel;

    private readonly tileId:number;

    constructor(dispatcher:ActionDispatcher, tileId:number, appServices:AppServices, service:KontextCollAPI, tilesModel:WdglanceTilesModel) {
        super(
            dispatcher,
            {
                isBusy: false,
                isExpanded:false,
                corpname: 'susanne', // TODO
                q: '',
                cattr: 'word',
                cfromw: -5,
                ctow: 5,
                cminfreq: 1,
                cminbgr: 3,
                cbgrfns: ['m', 't', 'd'],
                csortfn: 'm',
                data: Immutable.List<DataRow>(),
                heading: [],
                citemsperpage: 10,
                renderFrameSize: [10, 10]
            }
        );
        this.tileId = tileId;
        this.appServices = appServices;
        this.service = service;
        this.tilesModel = tilesModel;
        this.actionMatch = {
            [GlobalActionNames.RequestQueryResponse]: (state, action:GlobalActions.RequestQueryResponse)  => {
                const newState = this.copyState(state);
                newState.isBusy = true;
                return newState;
            },
            [GlobalActionNames.ExpandTile]: (state, action:GlobalActions.ExpandTile) => {
                let newState:CollocModelState;
                if (action.payload['ident'] === this.tileId) {
                    newState = this.copyState(state);
                    newState.isExpanded = true;

                } else {
                    newState = state;
                }
                return newState;
            },
            [GlobalActionNames.ResetExpandTile]: (state, action:GlobalActions.ResetExpandTile) => {
                let newState:CollocModelState;
                if (action.payload['ident'] === this.tileId) {
                    newState = this.copyState(state);
                    newState.isExpanded = false;

                } else {
                    newState = state;
                }
                return newState;
            },
            [ActionNames.DataLoadDone]: (state, action:Actions.DataLoadDone) => {
                const newState = this.copyState(state);
                newState.isBusy = false;
                newState.data = Immutable.List<DataRow>(action.payload.data);
                newState.heading = action.payload.heading;
                return newState;
            },
            [ActionNames.SizeUpdated]: (state, action:Actions.SizeUpdated) => {
                const newState = this.copyState(state);
                newState.renderFrameSize = action.payload.frameSize;
                return newState;
            }
        }
    }

    sideEffects(state:CollocModelState, action:Action, seDispatch:SEDispatcher):void {
        switch (action.name) {
            case GlobalActionNames.RequestQueryResponse:
                this.suspend(
                    (action:Action) => {
                        if (action.name === ConcActionNames.DataLoadDone) {
                            const payload = (action as ConcActions.DataLoadDone).payload;
                            this.service.call(stateToArgs(state, '~' + payload.data.conc_persistence_op_id)).subscribe(
                                (data) => {
                                    seDispatch({
                                        name: ActionNames.DataLoadDone,
                                        payload: {
                                            heading: data.Head,
                                            data: data.Items,
                                            frameSize: this.tilesModel.getFrameSize(this.tileId)
                                        }
                                    });
                                },
                                (err) => {
                                    this.appServices.showMessage(SystemMessageType.ERROR, err);
                                    seDispatch({
                                        name: ActionNames.DataLoadDone,
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
            case GlobalActionNames.AcknowledgeSizes:
                seDispatch({
                    name: ActionNames.SizeUpdated,
                    payload: {
                        frameSize: this.tilesModel.getFrameSize(this.tileId)
                    }
                });
            break;
        }
    }
}