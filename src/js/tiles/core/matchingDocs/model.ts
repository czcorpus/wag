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
import { Action, SEDispatcher, StatelessModel, IActionQueue } from 'kombo';
import { Observable, Observer } from 'rxjs';
import { concatMap } from 'rxjs/operators';

import { AppServices } from '../../../appServices';
import { Backlink } from '../../../common/tile';
import { ActionName as GlobalActionName, Actions as GlobalActions } from '../../../models/actions';
import { ConcLoadedPayload } from '../concordance/actions';
import { ActionName, Actions, DataLoadedPayload } from './actions';
import { callWithExtraVal } from '../../../common/api/util';
import { MatchingDocsModelState } from '../../../common/models/matchingDocs';
import { MatchingDocsAPI, DataRow } from '../../../common/api/abstract/matchingDocs';


export interface DocModelArgs {
    dispatcher:IActionQueue;
    tileId:number;
    waitForTiles:Array<number>;
    subqSourceTiles:Array<number>;
    appServices:AppServices;
    api:MatchingDocsAPI<{}>;
    backlink:Backlink|null;
    initState:MatchingDocsModelState;
}


export class MatchingDocsModel extends StatelessModel<MatchingDocsModelState> {

    protected api:MatchingDocsAPI<{}>;

    protected readonly appServices:AppServices;

    protected readonly tileId:number;

    protected waitForTiles:Immutable.Map<number, boolean>;

    protected subqSourceTiles:Immutable.Set<number>;

    private readonly backlink:Backlink|null;

    constructor({dispatcher, tileId, waitForTiles, subqSourceTiles, appServices, api, backlink, initState}) {
        super(dispatcher, initState);
        this.tileId = tileId;
        this.waitForTiles = Immutable.Map<number, boolean>(waitForTiles.map(v => [v, false]));
        this.subqSourceTiles = Immutable.Set<number>(subqSourceTiles);
        this.appServices = appServices;
        this.api = api;
        this.backlink = backlink;
        this.actionMatch = {
            [GlobalActionName.RequestQueryResponse]: (state, action:GlobalActions.RequestQueryResponse) => {
                const newState = this.copyState(state);
                newState.isBusy = true;
                newState.error = null;
                return newState;
            },
            [ActionName.NextPage]: (state, action:Actions.NextPage) => {
                if (action.payload.tileId === this.tileId) {
                    const newState = this.copyState(state);
                    if (newState.currPage * newState.maxNumCategoriesPerPage < newState.data.size) {
                        newState.currPage += 1;
                    }
                    return newState;
                }
                return state;
            },
            [ActionName.PreviousPage]: (state, action:Actions.PreviousPage) => {
                if (action.payload.tileId === this.tileId) {
                    const newState = this.copyState(state);
                    if (newState.currPage > 1) {
                        newState.currPage -= 1;
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

                    } else {
                        newState.data = Immutable.List<DataRow>(action.payload.data.map(v => ({
                                        name: this.appServices.translateDbValue(state.corpname, v.name),
                                        score: v.score
                                    })));
                        newState.currPage = 1;
                        newState.isBusy = false;
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
                this.waitForTiles = this.waitForTiles.map(_ => true).toMap();
                this.suspend((action:Action) => {
                    if (action.name === GlobalActionName.TileDataLoaded && this.waitForTiles.has(action.payload['tileId'])) {
                        const payload = (action as GlobalActions.TileDataLoaded<ConcLoadedPayload>).payload;
                        this.waitForTiles = this.waitForTiles.set(payload.tileId, false);
                        new Observable((observer:Observer<number>) => {
                            if (action.error) {
                                observer.error(new Error(this.appServices.translate('global__failed_to_obtain_required_data')));

                            } else {
                                state.srchAttrs.keySeq().forEach(critIdx => observer.next(critIdx));
                                observer.complete();
                            }
                        }).pipe(
                            concatMap(critIdx => callWithExtraVal(
                                    this.api,
                                    this.api.stateToArgs(state, payload.data.concPersistenceID),
                                    critIdx
                            ))
                        )
                        .subscribe(
                            ([resp, critIdx]) => {
                                dispatch<GlobalActions.TileDataLoaded<DataLoadedPayload>>({
                                    name: GlobalActionName.TileDataLoaded,
                                    payload: {
                                        tileId: this.tileId,
                                        isEmpty: resp.data.length === 0,
                                        data: resp.data.length > 0 ?
                                            resp.data.sort((x1, x2) => x2.score - x1.score).slice(0, state.maxNumCategories) :
                                            null,
                                        concId: resp.concId
                                    }
                                });
                            },
                            error => {
                                dispatch<GlobalActions.TileDataLoaded<DataLoadedPayload>>({
                                    name: GlobalActionName.TileDataLoaded,
                                    payload: {
                                        tileId: this.tileId,
                                        isEmpty: true,
                                        concId: null,
                                        data: null
                                    },
                                    error: error
                                });
                            }
                        );
                        return !this.waitForTiles.contains(true);
                    }
                    return false;
                });
            break;
        }
    }
}

export const factory = (
    dispatcher:IActionQueue,
    tileId:number,
    waitForTiles:Array<number>,
    subqSourceTiles:Array<number>,
    appServices:AppServices,
    api:MatchingDocsAPI<{}>,
    backlink:Backlink|null,
    initState:MatchingDocsModelState) => {

    return new MatchingDocsModel({
        dispatcher,
        tileId,
        waitForTiles,
        subqSourceTiles,
        appServices,
        api,
        backlink,
        initState
    });
}
