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

import { StatelessModel, IActionDispatcher, Action, SEDispatcher } from 'kombo';
import * as Immutable from 'immutable';
import { ActionName as GlobalActionName, Actions as GlobalActions } from '../../../models/actions';
import { DataLoadedPayload, OperationMode } from './actions';
import { ActionName, Actions } from './actions';
import { DatamuseMLApi, DatamuseWord, DatamuseApiArgs } from './api';
import { QueryFormModel, findCurrLemmaVariant } from '../../../models/query';



export interface DatamuseModelState {
    isBusy:boolean;
    isTweakMode:boolean;
    isMobile:boolean;
    isAltViewMode:boolean;
    error:string;
    maxResultItems:number;
    data:Immutable.List<DatamuseWord>;
    operationMode:OperationMode;
}


export class DatamuseModel extends StatelessModel<DatamuseModelState> {

    private readonly tileId:number;

    private readonly api:DatamuseMLApi;

    private readonly mainForm:QueryFormModel;

    constructor(dispatcher:IActionDispatcher, initState:DatamuseModelState, tileId:number, api:DatamuseMLApi, mainForm:QueryFormModel) {
        super(dispatcher, initState);
        this.tileId = tileId;
        this.api = api;
        this.mainForm = mainForm;

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
            [GlobalActionName.EnableAltViewMode]: (state, action:GlobalActions.EnableAltViewMode) => {
                if (action.payload.ident === this.tileId) {
                    const newState = this.copyState(state);
                    newState.isAltViewMode = true;
                    return newState;
                }
                return state;
            },
            [GlobalActionName.DisableAltViewMode]: (state, action:GlobalActions.DisableAltViewMode) => {
                if (action.payload.ident === this.tileId) {
                    const newState = this.copyState(state);
                    newState.isAltViewMode = false;
                    return newState;
                }
                return state;
            },
            [GlobalActionName.RequestQueryResponse]: (state, action:GlobalActions.RequestQueryResponse)  => {
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
                        newState.data = Immutable.List<DatamuseWord>();

                    } else {
                        newState.data = Immutable.List<DatamuseWord>(action.payload.words);
                    }
                    return newState;
                }
                return state;
            },
            [ActionName.SetOperationMode]: (state, action:Actions.SetOperationMode) => {
                if (action.payload.tileId === this.tileId) {
                    const newState = this.copyState(state);
                    newState.isBusy = true;
                    newState.operationMode = action.payload.value;
                    newState.data = Immutable.List<DatamuseWord>();
                    return newState;
                }
                return state;
            }
        }
    }

    private mkApiArgs(state:DatamuseModelState, query:string):DatamuseApiArgs {
        switch (state.operationMode) {
            case OperationMode.MeansLike:
                return {ml: query, max: state.maxResultItems};
            case OperationMode.SoundsLike:
                return {sl: query, max: state.maxResultItems};
        }
    }

    sideEffects(state:DatamuseModelState, action:Action, seDispatch:SEDispatcher):void {
        switch (action.name) {
            case GlobalActionName.RequestQueryResponse:
            case ActionName.SetOperationMode:
                const formState = this.mainForm.getState();
                this.api.call(
                    this.mkApiArgs(state, findCurrLemmaVariant(formState.lemmas).lemma)

                ).subscribe(
                    (data) => {
                        seDispatch<Action<DataLoadedPayload>>({
                            name: GlobalActionName.TileDataLoaded,
                            payload: {
                                tileId: this.tileId,
                                words: data
                            }
                        });

                    },
                    (err) => {
                        seDispatch<Action<DataLoadedPayload>>({
                            name: GlobalActionName.TileDataLoaded,
                            error: err
                        })
                    }
                );
            break;
            case GlobalActionName.GetSourceInfo:
                if (action.payload['tileId'] === this.tileId) {
                    seDispatch({
                        name: GlobalActionName.GetSourceInfoDone,
                        payload: {
                            data: {
                                tileId: this.tileId,
                                title: null,
                                description: null,
                                author: null
                            }
                        }
                    });
                }
            break;
        }
    }

}