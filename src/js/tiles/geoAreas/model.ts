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
import {Observable, Observer, of as rxOf, forkJoin} from 'rxjs';
import {concatMap} from 'rxjs/operators';
import * as Immutable from 'immutable';
import { StatelessModel, ActionDispatcher, Action, SEDispatcher } from 'kombo';
import {FreqDistribAPI, DataRow} from '../../common/api/kontextFreqs';
import {ActionName as GlobalActionName, Actions as GlobalActions} from '../../models/actions';
import {ActionName as ConcActionName, Actions as ConcActions} from '../concordance/actions';
import { AppServices } from '../../appServices';
import { ActionName, Actions } from './actions';
import { GeneralTTDistribModelState, stateToAPIArgs } from '../../common/models/freq';
import { ajax$, ResponseType } from '../../common/ajax';

/*
oral2013:

"pohraničí české": "naCPO",
"středočeská": "naSTR",
"jihozápadočeská": "naJZC",
"severovýchodočeská": "naSVC",
"česko-moravská": "naCMO",
"středomoravská": "naSTM",
"pohraničí moravské": "naMPO",
"slezská": "naSLE",
"východomoravská": "naVYM"

??:
"české pohraničí": "naCPO",
"středočeská": "naSTR",
"jihozápadočeská": "naJZC",
"severovýchodočeská": "naSVC",
"českomoravská": "naCMO",
"středomoravská": "naSTM",
"pohraničí moravské a slezské": "naMPO",
"slezská": "naSLE",
"východomoravská": "naVYM"
*/

export interface GeoAreasModelState extends GeneralTTDistribModelState {
    areaCodeMapping:Immutable.Map<string, string>;
    highlightedTableRow:number;
    mapSVG:string;
}


export class GeoAreasModel extends StatelessModel<GeoAreasModelState> {

    private readonly tileId:number;

    private readonly waitForTile:number;

    private readonly appServices:AppServices;

    private readonly api:FreqDistribAPI;

    constructor(dispatcher:ActionDispatcher, tileId:number, waitForTile:number, appServices:AppServices, api:FreqDistribAPI, initState:GeoAreasModelState) {
        super(dispatcher, initState);
        this.tileId = tileId;
        this.waitForTile = waitForTile;
        this.appServices = appServices;
        this.api = api;
        this.actionMatch = {
            [GlobalActionName.RequestQueryResponse]: (state, action:GlobalActions.RequestQueryResponse) => {
                const newState = this.copyState(state);
                newState.isBusy = true;
                newState.error = null;
                return newState;
            },
            [ActionName.LoadDataDone]: (state, action:Actions.LoadDataDone) => {
                if (action.payload.tileId === this.tileId) {
                    const newState = this.copyState(state);
                    newState.isBusy = false;
                    if (action.error) {
                        newState.data = Immutable.List<DataRow>();
                        newState.error = action.error.message;

                    } else if (action.payload.data.length === 0) {
                        newState.data = Immutable.List<DataRow>();
                        if (action.payload.mapSVG) {
                            newState.mapSVG = action.payload.mapSVG;
                        }

                    } else {
                        newState.data = Immutable.List<DataRow>(action.payload.data);
                        if (action.payload.mapSVG) {
                            newState.mapSVG = action.payload.mapSVG;
                        }
                    }
                    return newState;
                }
                return state;
            },
            [ActionName.SetHighlightedTableRow]: (state, action:Actions.SetHighlightedTableRow) => {
                if (action.payload.tileId === this.tileId) {
                    const newState = this.copyState(state);
                    newState.highlightedTableRow = newState.data.findIndex(v => v.name === action.payload.areaName);
                    return newState;
                }
                return state;
            },
            [ActionName.ClearHighlightedTableRow]: (state, action:Actions.ClearHighlightedTableRow) => {
                if (action.payload.tileId === this.tileId) {
                    const newState = this.copyState(state);
                    newState.highlightedTableRow = -1;
                    return newState;
                }
                return state;
            }
        }
    }

    private loadMap():Observable<string> {
        return ajax$<string>(
            'GET',
            this.appServices.createStaticUrl('mapCzech.inline.svg'),
            {},
            {
                responseType: ResponseType.TEXT
            }
        );
    }

    sideEffects(state:GeoAreasModelState, action:Action, dispatch:SEDispatcher):void {
        switch (action.name) {
            case GlobalActionName.RequestQueryResponse:
                this.suspend((action:Action) => {
                    if (action.name === ConcActionName.DataLoadDone && action.payload['tileId'] === this.waitForTile) {
                        const payload = (action as ConcActions.DataLoadDone).payload;

                        forkJoin(
                            new Observable((observer:Observer<{}>) => {
                                if (action.error) {
                                    observer.error(new Error(this.appServices.translate('global__failed_to_obtain_required_data')));

                                } else {
                                    observer.next({});
                                    observer.complete();
                                }
                            }).pipe(
                                concatMap(args => this.api.call(stateToAPIArgs(state, payload.data.conc_persistence_op_id)))
                            ),
                            state.mapSVG ? rxOf(null) : this.loadMap()
                        )
                        .subscribe(
                            resp => {
                                dispatch<Actions.LoadDataDone>({
                                    name: ActionName.LoadDataDone,
                                    payload: {
                                        data: resp[0].data,
                                        mapSVG: resp[1],
                                        concId: resp[0].concId,
                                        tileId: this.tileId
                                    }
                                });
                            },
                            error => {
                                dispatch<Actions.LoadDataDone>({
                                    name: ActionName.LoadDataDone,
                                    payload: {
                                        data: null,
                                        mapSVG: null,
                                        concId: null,
                                        tileId: this.tileId
                                    },
                                    error: error
                                });
                            }
                        );
                        return true;
                    }
                    return false;
                });
            break;
        }
    }

}