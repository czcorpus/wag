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
import { Action, SEDispatcher, StatelessModel, IActionQueue, IActionDispatcher } from 'kombo';
import { Observable, Observer } from 'rxjs';
import { flatMap } from 'rxjs/operators';

import { AppServices } from '../../../appServices';
import { ActionName as GlobalActionName, Actions as GlobalActions } from '../../../models/actions';
import { ConcLoadedPayload } from '../concordance/actions';
import { ActionName, Actions, DataLoadedPayload } from './actions';
import { MatchingDocsModelState } from '../../../common/models/matchingDocs';
import { MatchingDocsAPI, DataRow } from '../../../common/api/abstract/matchingDocs';
import { findCurrLemmaVariant } from '../../../models/query';
import { RecognizedQueries } from '../../../common/query';


export interface MatchingDocsModelArgs {
    dispatcher:IActionQueue;
    tileId:number;
    waitForTiles:Array<number>;
    subqSourceTiles:Array<number>;
    appServices:AppServices;
    api:MatchingDocsAPI<{}>;
    initState:MatchingDocsModelState;
    lemmas:RecognizedQueries;
}


export class MatchingDocsModel extends StatelessModel<MatchingDocsModelState> {

    private readonly lemmas:RecognizedQueries;

    protected api:MatchingDocsAPI<{}>;

    protected readonly appServices:AppServices;

    protected readonly tileId:number;

    protected waitForTiles:Immutable.Map<number, boolean>;

    protected subqSourceTiles:Immutable.Set<number>;

    constructor({dispatcher, tileId, waitForTiles, subqSourceTiles, appServices, api, initState, lemmas}:MatchingDocsModelArgs) {
        super(dispatcher, initState);
        this.tileId = tileId;
        this.waitForTiles = Immutable.Map<number, boolean>(waitForTiles.map(v => [v, false]));
        this.subqSourceTiles = Immutable.Set<number>(subqSourceTiles);
        this.appServices = appServices;
        this.api = api;
        this.lemmas = lemmas;
        this.actionMatch = {
            [GlobalActionName.RequestQueryResponse]: (state, action:GlobalActions.RequestQueryResponse) => {
                const newState = this.copyState(state);
                newState.isBusy = true;
                newState.error = null;
                return newState;
            },
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
            [ActionName.NextPage]: (state, action:Actions.NextPage) => {
                if (action.payload.tileId === this.tileId) {
                    const newState = this.copyState(state);
                    if (newState.currPage < newState.numPages) {
                        newState.currPage++;
                    }
                    return newState;
                }
                return state;
            },
            [ActionName.PreviousPage]: (state, action:Actions.PreviousPage) => {
                if (action.payload.tileId === this.tileId) {
                    const newState = this.copyState(state);
                    if (newState.currPage > 1) {
                        newState.currPage--;
                    }
                    return newState;
                }
                return state;
            },
            [GlobalActionName.TileDataLoaded]: (state, action:GlobalActions.TileDataLoaded<DataLoadedPayload>) => {
                if (action.payload.tileId === this.tileId) {
                    const newState = this.copyState(state);
                    if (action.error) {
                        newState.data = Immutable.List<DataRow>();
                        newState.error = action.error.message;
                        newState.isBusy = false;
                        newState.backlink = action.payload.backlink;
                    } else {
                        newState.data = Immutable.List<DataRow>(action.payload.data.map(v => ({
                            name: this.appServices.translateDbValue(state.corpname, v.name),
                            score: v.score
                        })));
                        newState.currPage = 1;
                        newState.numPages = Math.ceil(newState.data.size/newState.maxNumCategoriesPerPage);
                        newState.isBusy = false;
                        newState.backlink = action.payload.backlink;
                    }
                    return newState;
                }
                return state;
            }
        }
    }

    sideEffects(state:MatchingDocsModelState, action:Action, dispatch:SEDispatcher):void {
        switch (action.name) {
            case GlobalActionName.RequestQueryResponse:
                if (this.waitForTiles.size > 0) {
                    this.waitForTiles = this.waitForTiles.map(_ => true).toMap();
                    this.suspend((action:Action) => {
                        if (action.name === GlobalActionName.TileDataLoaded && this.waitForTiles.has(action.payload['tileId'])) {
                            const payload = (action as GlobalActions.TileDataLoaded<ConcLoadedPayload>).payload;
                            this.waitForTiles = this.waitForTiles.set(payload.tileId, false);
                            new Observable((observer:Observer<number>) => {
                                if (action.error) {
                                    observer.error(new Error(this.appServices.translate('global__failed_to_obtain_required_data')));
                                } else {
                                    observer.next(1);
                                    observer.complete();
                                }
                            }).pipe(flatMap(_ => this.api.call(this.api.stateToArgs(state, payload.data.concPersistenceID))))
                            .subscribe(
                                (resp) => {
                                    dispatch<GlobalActions.TileDataLoaded<DataLoadedPayload>>({
                                        name: GlobalActionName.TileDataLoaded,
                                        payload: {
                                            tileId: this.tileId,
                                            isEmpty: resp.data.length === 0,
                                            data: resp.data.sort((x1, x2) => x2.score - x1.score).slice(0, state.maxNumCategories),
                                            backlink: this.api.stateToBacklink(state, payload.data.concPersistenceID)
                                        }
                                    });
                                },
                                error => {
                                    dispatch<GlobalActions.TileDataLoaded<DataLoadedPayload>>({
                                        name: GlobalActionName.TileDataLoaded,
                                        payload: {
                                            tileId: this.tileId,
                                            isEmpty: true,
                                            data: null,
                                            backlink: null
                                        },
                                        error: error
                                    });
                                }
                            );
                            return !this.waitForTiles.contains(true);
                        }
                        return false;
                    });

                } else {
                    const variant = findCurrLemmaVariant(this.lemmas.get(0));
                    this.api.call(this.api.stateToArgs(state, variant.word))
                    .subscribe(
                        (resp) => {
                            dispatch<GlobalActions.TileDataLoaded<DataLoadedPayload>>({
                                name: GlobalActionName.TileDataLoaded,
                                payload: {
                                    tileId: this.tileId,
                                    isEmpty: resp.data.length === 0,
                                    data: resp.data.sort((x1, x2) => x2.score - x1.score).slice(0, state.maxNumCategories),
                                    backlink: this.api.stateToBacklink(state, null)
                                }
                            });
                        },
                        error => {
                            dispatch<GlobalActions.TileDataLoaded<DataLoadedPayload>>({
                                name: GlobalActionName.TileDataLoaded,
                                payload: {
                                    tileId: this.tileId,
                                    isEmpty: true,
                                    data: null,
                                    backlink: null
                                },
                                error: error
                            });
                        }
                    );
                }
            break;
            case GlobalActionName.GetSourceInfo:
                if (action.payload['tileId'] === this.tileId) {
                    this.api.getSourceDescription(this.tileId, this.appServices.getISO639UILang(), state.corpname)
                    .subscribe(
                        (data) => {
                            dispatch({
                                name: GlobalActionName.GetSourceInfoDone,
                                payload: {
                                    data: data
                                }
                            });
                        },
                        (err) => {
                            console.error(err);
                            dispatch({
                                name: GlobalActionName.GetSourceInfoDone,
                                error: err

                            });
                        }
                    );
                }
            break;
        }
    }
}
