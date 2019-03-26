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
import { Action, ActionDispatcher, SEDispatcher, StatelessModel } from 'kombo';

import { Backlink, BacklinkWithArgs, HTTPMethod } from '../../common/types';
import { ActionName as GlobalActionName, Actions as GlobalActions } from '../../models/actions';
import { WdglanceMainFormModel } from '../../models/query';
import { DataLoadedPayload } from './actions';
import { PageArgs, TreqAPI, TreqTranslation } from '../../common/api/treq';
import { TreqModelMinState, stateToPageArgs, stateToAPIArgs } from '../../common/models/treq';



export interface TreqModelState extends TreqModelMinState {
    isBusy:boolean;
    error:string;
    searchPackages:Immutable.List<string>;
    translations:Immutable.List<TreqTranslation>;
    sum:number;
    treqBackLink:BacklinkWithArgs<PageArgs>|null;
}


export class TreqModel extends StatelessModel<TreqModelState> {

    private readonly tileId:number;

    private readonly api:TreqAPI;

    private readonly mainForm:WdglanceMainFormModel;

    private readonly backlink:Backlink;

    constructor(dispatcher:ActionDispatcher, initialState:TreqModelState, tileId:number, api:TreqAPI,
            backlink:Backlink, mainForm:WdglanceMainFormModel) {
        super(dispatcher, initialState);
        this.api = api;
        this.backlink = backlink;
        this.mainForm = mainForm;
        this.tileId = tileId;
        this.actionMatch = {
            [GlobalActionName.RequestQueryResponse]: (state, action:GlobalActions.RequestQueryResponse) => {
                const newState = this.copyState(state);
                newState.isBusy = true;
                newState.error = null;
                return newState;
            },
            [GlobalActionName.TileDataLoaded]: (state, action:GlobalActions.TileDataLoaded<DataLoadedPayload>) => {
                if (action.payload.tileId === this.tileId) {
                    const newState = this.copyState(state);
                    newState.isBusy = false;
                    if (action.error) {
                        newState.translations = Immutable.List<TreqTranslation>();
                        newState.error = action.error.message;

                    } else {
                        newState.translations = Immutable.List<TreqTranslation>(action.payload.data.lines);
                        newState.sum = action.payload.data.sum;
                        newState.treqBackLink = this.makeBacklink(state, action.payload.query);
                    }
                    return newState;
                }
                return state;
            }
        }
    }

    private makeBacklink(state:TreqModelState, query:string):BacklinkWithArgs<PageArgs> {
        return this.backlink ?
            {
                url: this.backlink.url,
                label: this.backlink.label,
                method: this.backlink.method || HTTPMethod.GET,
                args: stateToPageArgs(state, query, state.searchPackages)
            } :
            null;
    }

    sideEffects(state:TreqModelState, action:Action, dispatch:SEDispatcher):void {
        switch (action.name) {
            case GlobalActionName.RequestQueryResponse:
                this.api.call(stateToAPIArgs(state, this.mainForm.getState().query.value, state.searchPackages)).subscribe(
                    (data) => {
                        dispatch<GlobalActions.TileDataLoaded<DataLoadedPayload>>({
                            name: GlobalActionName.TileDataLoaded,
                            payload: {
                                tileId: this.tileId,
                                isEmpty: data.lines.length === 0,
                                query: this.mainForm.getState().query.value,
                                subqueries: data.lines.map(v => ({value: v.right, interactionId: v.interactionId})),
                                lang1: this.mainForm.getState().targetLanguage,
                                lang2: this.mainForm.getState().targetLanguage2,
                                data: data
                            }
                        });
                    },
                    (error) => {
                        dispatch<GlobalActions.TileDataLoaded<DataLoadedPayload>>({
                            name: GlobalActionName.TileDataLoaded,
                            payload: {
                                tileId: this.tileId,
                                isEmpty: true,
                                query: this.mainForm.getState().query.value,
                                subqueries: [],
                                lang1: this.mainForm.getState().targetLanguage,
                                lang2: this.mainForm.getState().targetLanguage2,
                                data: {lines: [], sum: -1}
                            },
                            error: error
                        });
                    }
                );
            break;
        }
    }
}